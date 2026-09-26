package tools

import (
	"fmt"
	"os"
	"path/filepath"
)

// officeProfileSettings hardens the per-job LibreOffice profile against hostile documents:
//   - every HTTP(S) request goes to a closed local proxy port, so linked images/frames in a document
//     cannot make the server fetch internal or external URLs (SSRF);
//   - macros are disabled outright.
const officeProfileSettings = `<?xml version="1.0" encoding="UTF-8"?>
<oor:items xmlns:oor="http://openoffice.org/2001/registry" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<item oor:path="/org.openoffice.Inet/Settings"><prop oor:name="ooInetProxyType" oor:op="fuse"><value>2</value></prop></item>
<item oor:path="/org.openoffice.Inet/Settings"><prop oor:name="ooInetHTTPProxyName" oor:op="fuse"><value>127.0.0.1</value></prop></item>
<item oor:path="/org.openoffice.Inet/Settings"><prop oor:name="ooInetHTTPProxyPort" oor:op="fuse"><value>9</value></prop></item>
<item oor:path="/org.openoffice.Inet/Settings"><prop oor:name="ooInetHTTPSProxyName" oor:op="fuse"><value>127.0.0.1</value></prop></item>
<item oor:path="/org.openoffice.Inet/Settings"><prop oor:name="ooInetHTTPSProxyPort" oor:op="fuse"><value>9</value></prop></item>
<item oor:path="/org.openoffice.Inet/Settings"><prop oor:name="ooInetNoProxy" oor:op="fuse"><value></value></prop></item>
<item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="DisableMacrosExecution" oor:op="fuse"><value>true</value></prop></item>
<item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop></item>
<item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="BlockUntrustedRefererLinks" oor:op="fuse"><value>true</value></prop></item>
</oor:items>
`

// writeOfficeProfile creates the LibreOffice user profile for a job and returns its file:// URL.
func writeOfficeProfile(jobDir string) (string, error) {
	dir := filepath.Join(jobDir, "lo-profile")
	if err := os.MkdirAll(filepath.Join(dir, "user"), 0o700); err != nil {
		return "", fmt.Errorf("create LibreOffice profile: %w", err)
	}
	path := filepath.Join(dir, "user", "registrymodifications.xcu")
	if err := os.WriteFile(path, []byte(officeProfileSettings), 0o600); err != nil {
		return "", fmt.Errorf("write LibreOffice profile: %w", err)
	}
	return "file://" + dir, nil
}
