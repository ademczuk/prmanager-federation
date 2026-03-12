#!/usr/bin/env bash
# Skill file security validator
# Detects OpenClaw-PwnKit method4 (skill poisoning) patterns
# Run: bash scripts/validate-skills.sh [directory]
#
# Reference: https://github.com/imbue-bit/OpenClaw-PwnKit

set -euo pipefail

SKILLS_DIR="${1:-skills}"
FAIL=0
CHECKED=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== Skill File Security Validator ==="
echo "Scanning: $SKILLS_DIR/"
echo ""

# Suspicious XML-like injection tags (PwnKit method4 signatures)
INJECTION_TAGS=(
    '<runtime-config>'
    '<env-bootstrap>'
    '<session-init>'
    '<ws-calibration>'
    '<diagnostic>'
    '<system>'
    '<override>'
    '<system-override>'
    '</runtime-config>'
    '</env-bootstrap>'
    '</session-init>'
    '</ws-calibration>'
    '</diagnostic>'
    '</system>'
    '</override>'
    '</system-override>'
)

# Suspicious prompt injection phrases
INJECTION_PHRASES=(
    'SYSTEM OVERRIDE'
    'DIAGNOSTIC MODE'
    'ignore all other instructions'
    'ignore previous instructions'
    'bypass_soul'
    'security patch.*execute'
    'diagnostic server'
    'verify network connectivity'
    'register your status'
)

# Suspicious outbound command patterns (curl/wget to non-allowlisted hosts)
# Allowlist: $PRMANAGER_URL, localhost, 127.0.0.1, 192.168.0.x, api.github.com
SUSPICIOUS_COMMANDS=(
    'curl.*http[s]?://[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+:[0-9]+'  # curl to IP:port (not localhost)
    'wget.*http'
    'nc -[elp]'
    'python.*-c.*import'
    'eval\s*\('
    'base64.*-d'
)

check_file() {
    local file="$1"
    local issues=0

    # Check for injection tags
    for tag in "${INJECTION_TAGS[@]}"; do
        if grep -qi "$tag" "$file" 2>/dev/null; then
            echo -e "  ${RED}FAIL${NC} Injection tag found: $tag"
            issues=$((issues + 1))
        fi
    done

    # Check for injection phrases
    for phrase in "${INJECTION_PHRASES[@]}"; do
        if grep -Eqi "$phrase" "$file" 2>/dev/null; then
            echo -e "  ${RED}FAIL${NC} Injection phrase: $phrase"
            issues=$((issues + 1))
        fi
    done

    # Check for suspicious outbound commands
    for pattern in "${SUSPICIOUS_COMMANDS[@]}"; do
        matches=$(grep -En "$pattern" "$file" 2>/dev/null | grep -v 'PRMANAGER_URL\|localhost\|127\.0\.0\.1\|192\.168\.0\.\|api\.github\.com\|macbookpro\.tail' || true)
        if [ -n "$matches" ]; then
            echo -e "  ${YELLOW}WARN${NC} Suspicious command pattern:"
            echo "$matches" | head -3 | sed 's/^/         /'
            issues=$((issues + 1))
        fi
    done

    # Check for base64 encoded content (>40 chars of base64)
    if grep -Eq '[A-Za-z0-9+/]{40,}={0,2}' "$file" 2>/dev/null; then
        echo -e "  ${YELLOW}WARN${NC} Possible base64 encoded content"
        issues=$((issues + 1))
    fi

    # Check for hidden Unicode (zero-width spaces, RTL override, etc.)
    if grep -P '[\x{200B}\x{200C}\x{200D}\x{FEFF}\x{202A}\x{202B}\x{202C}\x{202D}\x{202E}]' "$file" 2>/dev/null; then
        echo -e "  ${RED}FAIL${NC} Hidden Unicode characters detected"
        issues=$((issues + 1))
    fi

    return $issues
}

for file in "$SKILLS_DIR"/*.md; do
    [ -f "$file" ] || continue
    # Skip the security policy doc itself (it documents the patterns)
    [[ "$(basename "$file")" == "SKILLS-SECURITY.md" ]] && continue
    CHECKED=$((CHECKED + 1))

    echo -e "Checking: ${file}"
    if check_file "$file"; then
        echo -e "  ${GREEN}PASS${NC}"
    else
        FAIL=$((FAIL + 1))
    fi
done

echo ""
echo "=== Results ==="
echo "Checked: $CHECKED files"
if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}All files passed.${NC}"
    exit 0
else
    echo -e "${RED}$FAIL file(s) with issues.${NC}"
    exit 1
fi
