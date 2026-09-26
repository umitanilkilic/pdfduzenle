package jobs

import (
	"context"
	"errors"
	"os"
	"sync/atomic"
	"testing"
	"time"

	"github.com/umitanilkilic/pdfduzenle/services/gateway/internal/tools"
)

type toolFunc func(ctx context.Context, in tools.Input) ([]tools.Output, error)

func (f toolFunc) Process(ctx context.Context, in tools.Input) ([]tools.Output, error) {
	return f(ctx, in)
}

func newManager(t *testing.T, opts Options) *Manager {
	t.Helper()
	opts.WorkDir = t.TempDir()
	if opts.MaxPending == 0 {
		opts.MaxPending = 10
	}
	if opts.TTL == 0 {
		opts.TTL = time.Hour
	}
	m, err := New(opts)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(m.Close)
	return m
}

func waitFor(t *testing.T, m *Manager, id string, want Status) Snapshot {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		if s, _ := m.Get(id); s.Status == want {
			return s
		}
		time.Sleep(5 * time.Millisecond)
	}
	s, _ := m.Get(id)
	t.Fatalf("job %s: status %s, want %s", id, s.Status, want)
	return s
}

func spec(tool tools.Tool) tools.Spec {
	return tools.Spec{ID: "t", Pool: "p", Timeout: time.Second, Tool: tool}
}

func TestJobSucceeds(t *testing.T) {
	m := newManager(t, Options{})
	id, dir, err := m.Create("t")
	if err != nil {
		t.Fatal(err)
	}
	if len(id) != 32 {
		t.Fatalf("id %q is not 128-bit hex", id)
	}
	m.Start(id, spec(toolFunc(func(_ context.Context, in tools.Input) ([]tools.Output, error) {
		return []tools.Output{{Path: in.Dir + "/out.pdf", Name: "a.pdf"}}, nil
	})), tools.Input{Dir: dir})
	s := waitFor(t, m, id, StatusDone)
	if len(s.Outputs) != 1 || s.Outputs[0].Name != "a.pdf" {
		t.Fatalf("outputs = %+v", s.Outputs)
	}
}

func TestJobFailureKeepsErrorCode(t *testing.T) {
	m := newManager(t, Options{})
	id, dir, _ := m.Create("t")
	m.Start(id, spec(toolFunc(func(context.Context, tools.Input) ([]tools.Output, error) {
		return nil, &tools.Error{Code: tools.CodeEncrypted}
	})), tools.Input{Dir: dir})
	if s := waitFor(t, m, id, StatusFailed); s.ErrorCode != tools.CodeEncrypted {
		t.Fatalf("code = %q", s.ErrorCode)
	}
}

func TestJobTimeout(t *testing.T) {
	m := newManager(t, Options{})
	id, dir, _ := m.Create("t")
	sp := spec(toolFunc(func(ctx context.Context, _ tools.Input) ([]tools.Output, error) {
		<-ctx.Done()
		return nil, ctx.Err()
	}))
	sp.Timeout = 20 * time.Millisecond
	m.Start(id, sp, tools.Input{Dir: dir})
	waitFor(t, m, id, StatusFailed)
}

func TestPoolLimitsConcurrency(t *testing.T) {
	m := newManager(t, Options{PoolSizes: map[string]int{"p": 2}})
	var running, peak atomic.Int32
	release := make(chan struct{})
	tool := toolFunc(func(context.Context, tools.Input) ([]tools.Output, error) {
		n := running.Add(1)
		for {
			p := peak.Load()
			if n <= p || peak.CompareAndSwap(p, n) {
				break
			}
		}
		<-release
		running.Add(-1)
		return nil, nil
	})
	var ids []string
	for range 5 {
		id, dir, _ := m.Create("t")
		ids = append(ids, id)
		m.Start(id, spec(tool), tools.Input{Dir: dir})
	}
	time.Sleep(50 * time.Millisecond)
	close(release)
	for _, id := range ids {
		waitFor(t, m, id, StatusDone)
	}
	if peak.Load() != 2 {
		t.Fatalf("peak concurrency = %d, want 2", peak.Load())
	}
}

func TestCreateRejectsWhenBusy(t *testing.T) {
	m := newManager(t, Options{MaxPending: 1})
	block := make(chan struct{})
	t.Cleanup(func() { close(block) })
	id, dir, err := m.Create("t")
	if err != nil {
		t.Fatal(err)
	}
	m.Start(id, spec(toolFunc(func(context.Context, tools.Input) ([]tools.Output, error) {
		<-block
		return nil, nil
	})), tools.Input{Dir: dir})
	if _, _, err := m.Create("t"); !errors.Is(err, ErrBusy) {
		t.Fatalf("err = %v, want ErrBusy", err)
	}
}

func TestUploadingJobsDoNotBlockTheQueue(t *testing.T) {
	m := newManager(t, Options{MaxPending: 1})
	for range 5 {
		id, _, err := m.Create("t") // e.g. slow clients still sending files
		if err != nil {
			t.Fatal(err)
		}
		if s, _ := m.Get(id); s.Status != StatusUploading {
			t.Fatalf("status = %s, want uploading", s.Status)
		}
	}
}

func TestSweepDeletesExpiredJobsAndFiles(t *testing.T) {
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	m := newManager(t, Options{TTL: time.Hour, Clock: func() time.Time { return now }})
	oldID, oldDir, _ := m.Create("t")
	now = now.Add(50 * time.Minute)
	newID, _, _ := m.Create("t")
	now = now.Add(20 * time.Minute)

	m.Sweep()
	if _, ok := m.Get(oldID); ok {
		t.Fatal("expired job still present")
	}
	if _, err := os.Stat(oldDir); !os.IsNotExist(err) {
		t.Fatal("expired job dir not deleted")
	}
	if _, ok := m.Get(newID); !ok {
		t.Fatal("fresh job was deleted")
	}
}

func TestDeleteRemovesFiles(t *testing.T) {
	m := newManager(t, Options{})
	id, dir, _ := m.Create("t")
	m.Delete(id)
	if _, err := os.Stat(dir); !os.IsNotExist(err) {
		t.Fatal("dir not removed")
	}
	if _, ok := m.Get(id); ok {
		t.Fatal("job still listed")
	}
}
