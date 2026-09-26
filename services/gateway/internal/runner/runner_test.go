package runner

import (
	"context"
	"errors"
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
