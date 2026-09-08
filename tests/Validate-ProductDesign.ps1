$ErrorActionPreference = "Stop"

$documentPath = Join-Path $PSScriptRoot "..\PRODUCT_DESIGN.md"

if (-not (Test-Path -LiteralPath $documentPath -PathType Leaf)) {
    throw "PRODUCT_DESIGN.md does not exist."
}

$content = Get-Content -LiteralPath $documentPath -Raw -Encoding UTF8
$requiredPatterns = @(
    "(?m)^# .*MVP.*$",
    "(?m)^## 1\.",
    "(?m)^## 2\.",
    "(?m)^## 4\.",
    "(?m)^## 5\.",
    "(?m)^## 6\.",
    "(?m)^## 9\."
)

foreach ($pattern in $requiredPatterns) {
    if ($content -notmatch $pattern) {
        throw "Missing required product design pattern: $pattern"
    }
}

$linesWithTrailingWhitespace = Get-Content -LiteralPath $documentPath -Encoding UTF8 |
    Where-Object { $_ -match "\s+$" }

if ($linesWithTrailingWhitespace.Count -gt 0) {
    throw "PRODUCT_DESIGN.md contains trailing whitespace."
}

Write-Output "Product design document validation passed."
