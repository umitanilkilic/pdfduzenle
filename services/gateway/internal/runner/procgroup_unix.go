//go:build unix

package runner

import (
	"os/exec"
	"syscall"
	"time"
)

// killProcessGroup makes the command lead its own process group and, when the context ends, kills the
// whole group: tools such as soffice start helper processes that would otherwise outlive the timeout
// (and keep the output pipes open, blocking Wait).
func killProcessGroup(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmd.Cancel = func() error {
		return syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
	}
	cmd.WaitDelay = 2 * time.Second
}
