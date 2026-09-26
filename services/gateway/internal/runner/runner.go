// Package runner executes external command-line tools safely.
package runner

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os/exec"
	"strings"
)

// Runner runs a program with arguments (never through a shell).
type Runner interface {
	Run(ctx context.Context, cmd Command) (Result, error)
}

type Command struct {
	Name string
	Args []string
	// Dir is the working directory; tools write only inside the job directory.
	Dir string
	// Env entries are appended to a minimal environment.
	Env []string
}

type Result struct {
	ExitCode int
	Stdout   string
	Stderr   string
}

// ErrTimeout is returned when the context deadline stops the process.
var ErrTimeout = errors.New("command timed out")

// ExitError reports a non-zero exit status together with the tool's output.
type ExitError struct {
	Command string
	Result  Result
}

func (e *ExitError) Error() string {
	return fmt.Sprintf("%s exited with %d: %s", e.Command, e.Result.ExitCode, strings.TrimSpace(tail(e.Result.Stderr, 500)))
}

// Exec is the real Runner.
type Exec struct{}

func (Exec) Run(ctx context.Context, c Command) (Result, error) {
	cmd := exec.CommandContext(ctx, c.Name, c.Args...)
	cmd.Dir = c.Dir
	cmd.Env = append([]string{"PATH=/usr/local/bin:/usr/bin:/bin", "HOME=" + c.Dir, "LANG=C.UTF-8"}, c.Env...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	res := Result{Stdout: stdout.String(), Stderr: stderr.String()}
	if ctx.Err() != nil {
		return res, fmt.Errorf("%s: %w", c.Name, ErrTimeout)
	}
	var exitErr *exec.ExitError
	if errors.As(err, &exitErr) {
		res.ExitCode = exitErr.ExitCode()
		return res, &ExitError{Command: c.Name, Result: res}
	}
	if err != nil {
		return res, fmt.Errorf("run %s: %w", c.Name, err)
	}
	return res, nil
}

func tail(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[len(s)-n:]
}
