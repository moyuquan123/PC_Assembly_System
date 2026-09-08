$ErrorActionPreference = "Stop"

$documentPath = Join-Path $PSScriptRoot "..\PRODUCT_DESIGN.md"

if (-not (Test-Path -LiteralPath $documentPath -PathType Leaf)) {
    throw "PRODUCT_DESIGN.md does not exist."
}

$content = Get-Content -LiteralPath $documentPath -Raw -Encoding UTF8
$requiredSections = @(
    "# PC 装机系统 MVP 产品设计文档",
    "## 1. 产品概述",
    "## 2. 产品目标",
    "## 4. 核心流程",
    "## 5. 主要功能",
    "## 6. 兼容性检查范围",
    "## 9. MVP 验收标准"
)

foreach ($section in $requiredSections) {
    if (-not $content.Contains($section)) {
        throw "Missing required section: $section"
    }
}

$linesWithTrailingWhitespace = Get-Content -LiteralPath $documentPath -Encoding UTF8 |
    Where-Object { $_ -match "\s+$" }

if ($linesWithTrailingWhitespace.Count -gt 0) {
    throw "PRODUCT_DESIGN.md contains trailing whitespace."
}

Write-Output "Product design document validation passed."
