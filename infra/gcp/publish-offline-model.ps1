param(
    [string]$ProjectId = "retinascan-ai-f620e",
    [string]$Location = "asia-south1",
    [string]$Bucket = "$ProjectId-offline-assets",
    [string]$ModelVersion = "aptos-baseline-v1",
    [string]$ModelPath = "",
    [string]$AllowedOrigins = "https://netr-ai.orbionixtech.com,https://www.netr-ai.orbionixtech.com"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
if (-not $ModelPath) {
    $ModelPath = Join-Path $RepoRoot "backend\models\dr_classifier.onnx"
}

if (-not (Test-Path -LiteralPath $ModelPath)) {
    throw "ONNX model not found at $ModelPath. Export or download aptos-baseline-v1 first."
}

$env:CLOUDSDK_CONFIG = Join-Path $RepoRoot ".gcloud"
New-Item -ItemType Directory -Force -Path $env:CLOUDSDK_CONFIG | Out-Null

function Invoke-Gcloud {
    & gcloud @args
    if ($LASTEXITCODE -ne 0) {
        throw "gcloud command failed: gcloud $($args -join ' ')"
    }
}

function Test-GcloudExists {
    try {
        & gcloud @args *> $null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

$activeAccount = & gcloud auth list --filter=status:ACTIVE --format="value(account)"
if ($LASTEXITCODE -ne 0 -or -not $activeAccount) {
    throw "No active gcloud account. Run: .\infra\gcp\login.ps1"
}

Write-Host "Publishing offline model asset..."
Write-Host "Project: $ProjectId"
Write-Host "Bucket:  gs://$Bucket"
Write-Host "Model:   $ModelPath"

if (-not (Test-GcloudExists storage buckets describe "gs://$Bucket" --project $ProjectId)) {
    Invoke-Gcloud storage buckets create "gs://$Bucket" `
        --project $ProjectId `
        --location $Location `
        --uniform-bucket-level-access
}

$corsOrigins = @($AllowedOrigins.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ })
$corsRule = [ordered]@{
    origin = $corsOrigins
    method = @("GET", "HEAD")
    responseHeader = @("Content-Type", "Content-Length", "ETag", "Cache-Control")
    maxAgeSeconds = 3600
}
$corsConfig = ConvertTo-Json -InputObject @($corsRule) -Depth 5

$corsFile = Join-Path $env:CLOUDSDK_CONFIG "offline-assets-cors.json"
Set-Content -Path $corsFile -Value $corsConfig -Encoding utf8

Invoke-Gcloud storage buckets update "gs://$Bucket" --cors-file $corsFile
Invoke-Gcloud storage buckets add-iam-policy-binding "gs://$Bucket" `
    --member allUsers `
    --role roles/storage.objectViewer

$objectPath = "models/$ModelVersion/dr_classifier.onnx"
Invoke-Gcloud storage cp $ModelPath "gs://$Bucket/$objectPath" `
    --cache-control "public,max-age=31536000,immutable"

Write-Host ""
Write-Host "Offline model URL:"
Write-Host "https://storage.googleapis.com/$Bucket/$objectPath"
Write-Host ""
Write-Host "Set this in Cloudflare Pages:"
Write-Host "VITE_OFFLINE_MODEL_URL=https://storage.googleapis.com/$Bucket/$objectPath"
