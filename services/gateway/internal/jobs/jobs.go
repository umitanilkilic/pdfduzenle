// Package jobs runs tool jobs in the background with per-pool concurrency limits and expiry.
package jobs

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/umitanilkilic/pdfduzenle/services/gateway/internal/tools"
)

type Status string

const (
	StatusQueued  Status = "queued"
	StatusRunning Status = "running"
	StatusDone    Status = "done"
	StatusFailed  Status = "failed"
)

// ErrBusy means too many jobs are waiting; the client should retry later.
var ErrBusy = errors.New("too many pending jobs")

// Snapshot is a copy of a job's state that is safe to hand to other goroutines.
type Snapshot struct {
	ID        string
	Tool      string
	Status    Status
	ErrorCode string
	Outputs   []tools.Output
	CreatedAt time.Time
}

type job struct {
	Snapshot
	dir string
}

type Clock func() time.Time

type Options struct {
	WorkDir string
	// TTL after which a job and its files are deleted, whatever its state.
	TTL time.Duration
	// PoolSizes limits concurrent jobs per pool; unknown pools get size 1.
	PoolSizes map[string]int
	// MaxPending caps queued + running jobs.
	MaxPending int
	Clock      Clock
	Log        *slog.Logger
}

type Manager struct {
	opts   Options
	ctx    context.Context
	cancel context.CancelFunc
	wg     sync.WaitGroup

	mu    sync.Mutex
	jobs  map[string]*job
	pools map[string]chan struct{}
}

func New(opts Options) (*Manager, error) {
	if opts.Clock == nil {
		opts.Clock = time.Now
	}
	if opts.Log == nil {
		opts.Log = slog.New(slog.DiscardHandler)
	}
	if err := os.MkdirAll(opts.WorkDir, 0o700); err != nil {
		return nil, fmt.Errorf("create work dir: %w", err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	return &Manager{opts: opts, ctx: ctx, cancel: cancel, jobs: map[string]*job{}, pools: map[string]chan struct{}{}}, nil
}

// Create reserves a new job and its private directory for uploads.
func (m *Manager) Create(tool string) (id, dir string, err error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.pendingLocked() >= m.opts.MaxPending {
		return "", "", ErrBusy
	}
	id = newID()
	dir = filepath.Join(m.opts.WorkDir, id)
	if err := os.Mkdir(dir, 0o700); err != nil {
		return "", "", fmt.Errorf("create job dir: %w", err)
	}
	m.jobs[id] = &job{Snapshot: Snapshot{ID: id, Tool: tool, Status: StatusQueued, CreatedAt: m.opts.Clock()}, dir: dir}
	return id, dir, nil
}

// Start runs the tool for a created job in the background.
func (m *Manager) Start(id string, spec tools.Spec, in tools.Input) {
	m.wg.Add(1)
	go func() {
		defer m.wg.Done()
		pool := m.pool(spec.Pool)
		select {
		case pool <- struct{}{}:
		case <-m.ctx.Done():
			m.finish(id, nil, m.ctx.Err())
			return
		}
		defer func() { <-pool }()

		m.update(id, func(j *job) { j.Status = StatusRunning })
		ctx, cancel := context.WithTimeout(m.ctx, spec.Timeout)
		defer cancel()
		outputs, err := spec.Tool.Process(ctx, in)
		m.finish(id, outputs, err)
	}()
}

func (m *Manager) finish(id string, outputs []tools.Output, err error) {
	m.update(id, func(j *job) {
		if err != nil {
			j.Status = StatusFailed
			j.ErrorCode = tools.CodeOf(err)
			m.opts.Log.Warn("job failed", "id", id, "tool", j.Tool, "err", err)
			return
		}
		j.Status = StatusDone
		j.Outputs = outputs
	})
}

func (m *Manager) Get(id string) (Snapshot, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	j, ok := m.jobs[id]
	if !ok {
		return Snapshot{}, false
	}
	s := j.Snapshot
	s.Outputs = append([]tools.Output(nil), j.Outputs...)
	return s, true
}

// Delete removes a job and its files. Running jobs finish in the background and are then discarded.
func (m *Manager) Delete(id string) {
	m.mu.Lock()
	j, ok := m.jobs[id]
	delete(m.jobs, id)
	m.mu.Unlock()
	if ok {
		m.removeDir(j.dir)
	}
}

// Sweep deletes jobs older than the TTL.
func (m *Manager) Sweep() {
	cutoff := m.opts.Clock().Add(-m.opts.TTL)
	m.mu.Lock()
	var expired []string
	for id, j := range m.jobs {
		if j.CreatedAt.Before(cutoff) {
			expired = append(expired, id)
		}
	}
	m.mu.Unlock()
	for _, id := range expired {
		m.Delete(id)
	}
}

// RunSweeper sweeps periodically until ctx is done.
func (m *Manager) RunSweeper(ctx context.Context, every time.Duration) {
	t := time.NewTicker(every)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			m.Sweep()
		}
	}
}

// Close cancels running jobs, waits for them and deletes all job files.
func (m *Manager) Close() {
	m.cancel()
	m.wg.Wait()
	m.mu.Lock()
	ids := make([]string, 0, len(m.jobs))
	for id := range m.jobs {
		ids = append(ids, id)
	}
	m.mu.Unlock()
	for _, id := range ids {
		m.Delete(id)
	}
}

func (m *Manager) update(id string, fn func(*job)) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if j, ok := m.jobs[id]; ok {
		fn(j)
	}
}

func (m *Manager) pool(name string) chan struct{} {
	m.mu.Lock()
	defer m.mu.Unlock()
	p, ok := m.pools[name]
	if !ok {
		size := m.opts.PoolSizes[name]
		if size < 1 {
			size = 1
		}
		p = make(chan struct{}, size)
		m.pools[name] = p
	}
	return p
}

func (m *Manager) pendingLocked() int {
	n := 0
	for _, j := range m.jobs {
		if j.Status == StatusQueued || j.Status == StatusRunning {
			n++
		}
	}
	return n
}

func (m *Manager) removeDir(dir string) {
	if err := os.RemoveAll(dir); err != nil {
		m.opts.Log.Error("remove job dir", "dir", dir, "err", err)
	}
}

// newID returns 128 random bits; job IDs double as unguessable access tokens.
func newID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
