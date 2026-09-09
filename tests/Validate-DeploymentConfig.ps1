$ErrorActionPreference = "Stop"

$nginxPath = Join-Path $PSScriptRoot "..\deploy\nginx.conf"
$composePath = Join-Path $PSScriptRoot "..\docker-compose.yml"
$nginx = Get-Content -LiteralPath $nginxPath -Raw -Encoding UTF8
$compose = Get-Content -LiteralPath $composePath -Raw -Encoding UTF8

foreach ($required in @('$privacy_safe_uri', '/builds/:shareCode', '/api/v1/builds/:shareCode')) {
    if (-not $nginx.Contains($required)) {
        throw "Nginx privacy logging is missing: $required"
    }
}

foreach ($forbidden in @('$request"', '$http_referer')) {
    if ($nginx.Contains($forbidden)) {
        throw "Nginx privacy logging contains a sensitive request field: $forbidden"
    }
}

foreach ($required in @('migrate:', 'seed:', 'service_completed_successfully', 'packages/database/dist/migrate.js', 'packages/database/dist/seed.js')) {
    if (-not $compose.Contains($required)) {
        throw "Docker Compose initialization is missing: $required"
    }
}

Write-Output "Deployment configuration validation passed."
