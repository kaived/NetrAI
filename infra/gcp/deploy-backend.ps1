param(
    [ValidateSet("stub", "onnx")]
    [string]$InferenceMode = "stub",
    [string]$ProjectId = "retinascan-ai-f620e",
    [string]$Region = "asia-south1",
    [string]$ServiceName = "retinascan-api",
    [string]$ServiceAccountName = "retinascan-api-sa",
    [string]$ModelBucket = "$ProjectId-models",
    [string]$InputBucket = "$ProjectId-inputs",
    [string]$OutputBucket = "$ProjectId-outputs",
    [string]$CorsOrigins = "https://netr-ai.orbionixtech.com,https://www.netr-ai.orbionixtech.com,http://localhost:5173,http://localhost:4173",
    [string]$ModelVersion = "demo-stub-v0"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$BackendDir = Join-Path $RepoRoot "backend"
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

if ($InferenceMode -eq "onnx") {
    $localModelPath = Join-Path $BackendDir "models\dr_classifier.onnx"
    if (-not (Test-Path -LiteralPath $localModelPath)) {
        throw "ONNX model not found at $localModelPath. Train/export from MATLAB first or deploy with -InferenceMode stub."
    }

    Write-Host "Uploading ONNX model to Cloud Storage..."
    Invoke-Gcloud storage cp $localModelPath "gs://$ModelBucket/models/dr_classifier.onnx"
    $ModelVersion = "aptos-baseline-v1"
}

$serviceAccountEmail = "$ServiceAccountName@$ProjectId.iam.gserviceaccount.com"
$modelGcsUri = if ($InferenceMode -eq "onnx") { "gs://$ModelBucket/models/dr_classifier.onnx" } else { "" }

$envVars = [ordered]@{
    ENVIRONMENT = "production"
    API_CORS_ORIGINS = $CorsOrigins
    GCP_PROJECT_ID = $ProjectId
    FIREBASE_PROJECT_ID = $ProjectId
    FIRESTORE_ENABLED = "true"
    FIRESTORE_CASES_COLLECTION = "cases"
    GCS_ENABLED = "true"
    GCS_INPUT_BUCKET = $InputBucket
    GCS_OUTPUT_BUCKET = $OutputBucket
    INFERENCE_MODE = $InferenceMode
    MODEL_VERSION = $ModelVersion
    MODEL_PATH = "models/dr_classifier.onnx"
    MODEL_GCS_URI = $modelGcsUri
    MODEL_INPUT_SIZE = "224"
    MODEL_OUTPUT_FORMAT = "logits"
    MODEL_CHANNEL_ORDER = "rgb"
    MODEL_LAYOUT = "auto"
    MODEL_INPUT_SCALE = "0_1"
    MODEL_APPLY_CLAHE = "true"
    QUALITY_MIN_FOCUS_SCORE = "1.0"
    QUALITY_MIN_BRIGHTNESS = "0.15"
    QUALITY_MAX_BRIGHTNESS = "0.90"
    QUALITY_MIN_CONTRAST = "0.05"
}

$envVarsFile = Join-Path $env:CLOUDSDK_CONFIG "cloud-run-env.yaml"
$envFileLines = foreach ($entry in $envVars.GetEnumerator()) {
    $escapedValue = ([string]$entry.Value).Replace("\", "\\").Replace('"', '\"')
    "$($entry.Key): ""$escapedValue"""
}
Set-Content -Path $envVarsFile -Value $envFileLines -Encoding utf8

Write-Host "Deploying $ServiceName to Cloud Run in $Region..."
Invoke-Gcloud run deploy $ServiceName `
    --source $BackendDir `
    --region $Region `
    --project $ProjectId `
    --service-account $serviceAccountEmail `
    --allow-unauthenticated `
    --memory 2Gi `
    --cpu 2 `
    --min-instances 1 `
    --max-instances 5 `
    --env-vars-file $envVarsFile

Write-Host ""
Write-Host "Deployment complete. Copy the Cloud Run URL and use it as VITE_API_BASE_URL for Cloudflare Pages."
