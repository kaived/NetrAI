param(
    [string]$ProjectId = "retinascan-ai-f620e",
    [string]$ModelBucket = "$ProjectId-models",
    [string]$LocalModelPath = "backend\models\dr_classifier.onnx"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$env:CLOUDSDK_CONFIG = Join-Path $RepoRoot ".gcloud"
New-Item -ItemType Directory -Force -Path $env:CLOUDSDK_CONFIG | Out-Null

function Invoke-Gcloud {
    & gcloud @args
    if ($LASTEXITCODE -ne 0) {
        throw "gcloud command failed: gcloud $($args -join ' ')"
    }
}

$activeAccount = & gcloud auth list --filter=status:ACTIVE --format="value(account)"
if ($LASTEXITCODE -ne 0 -or -not $activeAccount) {
    throw "No active gcloud account. Run: gcloud auth login"
}

$resolvedModelPath = Resolve-Path (Join-Path $RepoRoot $LocalModelPath)
Invoke-Gcloud storage cp $resolvedModelPath "gs://$ModelBucket/models/dr_classifier.onnx"

Write-Host "Uploaded model to gs://$ModelBucket/models/dr_classifier.onnx"
