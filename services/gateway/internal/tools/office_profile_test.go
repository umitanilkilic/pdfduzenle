package tools

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestWriteOfficeProfile(t *testing.T) {
	dir := t.TempDir()
	url, err := writeOfficeProfile(dir)
	if err != nil {
		t.Fatal(err)
	}
	if url != "file://"+filepath.Join(dir, "lo-profile") {
		t.Fatalf("url = %s", url)
	}
	data, err := os.ReadFile(filepath.Join(dir, "lo-profile", "user", "registrymodifications.xcu"))
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{`"ooInetProxyType"`, `<value>9</value>`, `"DisableMacrosExecution"`} {
		if !strings.Contains(string(data), want) {
			t.Errorf("profile lacks %s", want)
		}
	}
}
