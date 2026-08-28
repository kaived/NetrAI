param(
    [string]$ProjectId = "retinascan-ai-f620e",
    [string]$Region = "asia-south1",
    [string]$ServiceAccountName = "retinascan-api-sa",
    [string]$ArtifactRepo = "retinascan",
    [string]$ModelBucket = "$ProjectId-models",
    [string]$InputBucket = "$ProjectId-inputs",
    [string]$OutputBucket = "$ProjectId-outputs"
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

function Test-GcloudExists {
    $oldErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        & gcloud @args *> $null
        return $LASTEXITCODE -eq 0
    }
    finally {
        $ErrorActionPreference = $oldErrorActionPreference
    }
}

Write-Host "Using project: $ProjectId"
Write-Host "Using region:  $Region"

Invoke-Gcloud config set project $ProjectId
Invoke-Gcloud config set run/region $Region

$activeAccount = & gcloud auth list --filter=status:ACTIVE --format="value(account)"
if ($LASTEXITCODE -ne 0 -or -not $activeAccount) {
    throw "No active gcloud account. Run: gcloud auth login"
}

Write-Host "Active account: $activeAccount"

Write-Host "Enabling required APIs..."
Invoke-Gcloud services enable `
    run.googleapis.com `
    cloudbuild.googleapis.com `
    artifactregistry.googleapis.com `
    firestore.googleapis.com `
    storage.googleapis.com

Write-Host "Creating Artifact Registry repository if missing..."
$repoExists = Test-GcloudExists artifacts repositories describe $ArtifactRepo --location $Region --format "value(name)"
if (-not $repoExists) {
    Invoke-Gcloud artifacts repositories create $ArtifactRepo `
        --repository-format docker `
        --location $Region `
        --description "RetinaScan AI container images"
}

Write-Host "Creating storage buckets if missing..."
foreach ($bucket in @($ModelBucket, $InputBucket, $OutputBucket)) {
    $bucketExists = Test-GcloudExists storage buckets describe "gs://$bucket" --format "value(name)"
    if (-not $bucketExists) {
        Invoke-Gcloud storage buckets create "gs://$bucket" `
            --location $Region `
            --uniform-bucket-level-access `
            --public-access-prevention
    }
}

Write-Host "Creating Cloud Run service account if missing..."
$serviceAccountEmail = "$ServiceAccountName@$ProjectId.iam.gserviceaccount.com"
$serviceAccountExists = Test-GcloudExists iam service-accounts describe $serviceAccountEmail --format "value(email)"
if (-not $serviceAccountExists) {
    Invoke-Gcloud iam service-accounts create $ServiceAccountName `
        --display-name "RetinaScan AI API"
}

Write-Host "Granting backend permissions..."
Invoke-Gcloud projects add-iam-policy-binding $ProjectId `
    --member "serviceAccount:$serviceAccountEmail" `
    --role "roles/datastore.user"

Invoke-Gcloud projects add-iam-policy-binding $ProjectId `
    --member "serviceAccount:$serviceAccountEmail" `
    --role "roles/storage.objectAdmin"

Write-Host ""
Write-Host "GCP bootstrap complete."
Write-Host "Service account: $serviceAccountEmail"
Write-Host "Model bucket:     gs://$ModelBucket"
Write-Host "Input bucket:     gs://$InputBucket"
Write-Host "Output bucket:    gs://$OutputBucket"
