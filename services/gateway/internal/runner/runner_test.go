package runner

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"testing"
	"time"
)

func TestExecSuccess(t *testing.T) {
	res, err := Exec{}.Run(context.Background(), Command{Name: "echo", Args: []string{"merhaba; rm -rf /"}, Dir: t.TempDir()})
	if err != nil {
		t.Fatal(err)
	}
	// Arguments are passed verbatim, never interpreted by a shell.
	if res.Stdout != "merhaba; rm -rf /\n" {
		t.Fatalf("stdout = %q", res.Stdout)
	}
}

func TestExecExitCode(t *testing.T) {
	_, err := Exec{}.Run(context.Background(), Command{Name: "false", Dir: t.TempDir()})
	var exitErr *ExitError
	if !errors.As(err, &exitErr) || exitErr.Result.ExitCode != 1 {
		t.Fatalf("err = %v, want ExitError with code 1", err)
	}
}

func TestExecTimeout(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()
	_, err := Exec{}.Run(ctx, Command{Name: "sleep", Args: []string{"5"}, Dir: t.TempDir()})
	if !errors.Is(err, ErrTimeout) {
		t.Fatalf("err = %v, want ErrTimeout", err)
	}
}

func TestExecMissingBinary(t *testing.T) {
	_, err := Exec{}.Run(context.Background(), Command{Name: "definitely-not-a-binary", Dir: t.TempDir()})
	if err == nil {
		t.Fatal("expected error")
	}
}

// A timed-out tool must not leave child processes behind (soffice → oosplash → soffice.bin).
func TestExecTimeoutKillsChildProcesses(t *testing.T) {
	marker := "31.4159"
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()
	start := time.Now()
	_, err := Exec{}.Run(ctx, Command{Name: "sh", Args: []string{"-c", "sleep " + marker + " & wait"}, Dir: t.TempDir()})
	if !errors.Is(err, ErrTimeout) {
		t.Fatalf("err = %v, want ErrTimeout", err)
	}
	// The child keeps the output pipe open; Run must still return right after the deadline.
	if elapsed := time.Since(start); elapsed > 3*time.Second {
		t.Errorf("Run returned after %v, want shortly after the timeout", elapsed)
	}
	time.Sleep(100 * time.Millisecond)
	if pids := processesWith(t, "sleep "+marker); len(pids) > 0 {
		for _, pid := range pids {
			_ = syscall.Kill(pid, syscall.SIGKILL)
		}
		t.Fatalf("orphaned child processes: %v", pids)
	}
}

func processesWith(t *testing.T, needle string) []int {
	t.Helper()
	entries, err := os.ReadDir("/proc")
	if err != nil {
		t.Skip("no /proc")
	}
	var pids []int
	for _, e := range entries {
		pid, err := strconv.Atoi(e.Name())
		if err != nil {
			continue
		}
		cmdline, _ := os.ReadFile(filepath.Join("/proc", e.Name(), "cmdline"))
		if strings.Contains(strings.ReplaceAll(string(cmdline), "\x00", " "), needle) {
			pids = append(pids, pid)
		}
	}
	return pids
}
