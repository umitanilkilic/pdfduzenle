//go:build !unix

package runner

import (
	"os/exec"
	"time"
)

func killProcessGroup(cmd *exec.Cmd) {
	cmd.WaitDelay = 2 * time.Second
}
