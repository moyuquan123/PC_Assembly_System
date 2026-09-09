$ErrorActionPreference = "Stop"

$documentPath = Join-Path $PSScriptRoot "..\docs\TECHNICAL_SOLUTION.md"

if (-not (Test-Path -LiteralPath $documentPath -PathType Leaf)) {
    throw "docs/TECHNICAL_SOLUTION.md does not exist."
}

$content = Get-Content -LiteralPath $documentPath -Raw -Encoding UTF8
$requiredPatterns = @(
    "(?m)^# .*MVP.*$",
    "(?m)^## 3\.",
    "(?m)^## 6\.",
    "(?m)^## 7\.",
    "(?m)^## 8\.",
    "(?m)^## 10\.",
    "(?m)^## 12\.",
    "(?m)^## 13\.",
    "(?m)^## 15\.",
    "(?m)^## 16\.",
    "React 19.*Vite.*TypeScript",
    "Node.js 24 LTS.*Fastify 5",
    "PostgreSQL 17",
    "POST /api/v1/recommendations",
    "recommendationVersion",
    "cloud.tencent.com",
    "help.aliyun.com"
)

foreach ($pattern in $requiredPatterns) {
    if ($content -notmatch $pattern) {
        throw "Missing required technical solution pattern: $pattern"
    }
}

$linesWithTrailingWhitespace = Get-Content -LiteralPath $documentPath -Encoding UTF8 |
    Where-Object { $_ -match "\s+$" }

if ($linesWithTrailingWhitespace.Count -gt 0) {
    throw "docs/TECHNICAL_SOLUTION.md contains trailing whitespace."
}

Write-Output "Technical solution document validation passed."
