param(
    [string]$ProjectId = "retinascan-ai-f620e",
    [string]$Region = "asia-south1"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$env:CLOUDSDK_CONFIG = Join-Path $RepoRoot ".gcloud"
New-Item -ItemType Directory -Force -Path $env:CLOUDSDK_CONFIG | Out-Null

gcloud auth login
if ($LASTEXITCODE -ne 0) {
    throw "gcloud auth login failed."
}

gcloud config set project $ProjectId
if ($LASTEXITCODE -ne 0) {
    throw "Could not set gcloud project."
}

gcloud config set run/region $Region
if ($LASTEXITCODE -ne 0) {
    throw "Could not set Cloud Run region."
}

Write-Host "gcloud login ready for project $ProjectId in $Region."

