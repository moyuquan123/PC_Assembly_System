$ErrorActionPreference = "Stop"

$documentPath = Join-Path $PSScriptRoot "..\docs\RELEASE_CHECKLIST.md"

if (-not (Test-Path -LiteralPath $documentPath -PathType Leaf)) {
    throw "docs/RELEASE_CHECKLIST.md does not exist."
}

$content = Get-Content -LiteralPath $documentPath -Raw -Encoding UTF8
$requiredPatterns = @(
    "(?m)^# PC .*$",
    "(?m)^## 1\.",
    "(?m)^## 2\.",
    "(?m)^## 3\.",
    "(?m)^## 4\.",
    "(?m)^## 5\.",
    "PostgreSQL",
    "npm run validate",
    "Git SHA"
)

foreach ($pattern in $requiredPatterns) {
    if ($content -notmatch $pattern) {
        throw "Missing required release checklist pattern: $pattern"
    }
}

$linesWithTrailingWhitespace = Get-Content -LiteralPath $documentPath -Encoding UTF8 |
    Where-Object { $_ -match "\s+$" }

if ($linesWithTrailingWhitespace.Count -gt 0) {
    throw "docs/RELEASE_CHECKLIST.md contains trailing whitespace."
}

Write-Output "Release checklist validation passed."
