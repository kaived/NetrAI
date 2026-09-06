param(
    [ValidateSet("stub", "onnx")]
    [string]$InferenceMode = "onnx",
    [string]$ProjectId = "retinascan-ai-f620e",
    [string]$Region = "asia-south1",
    [string]$ServiceName = "retinascan-api",
    [string]$ServiceAccountName = "retinascan-api-sa",
    [string]$ModelBucket = "$ProjectId-models",
    [string]$InputBucket = "$ProjectId-inputs",
    [string]$OutputBucket = "$ProjectId-outputs",
    [string]$CorsOrigins = "https://netr-ai.orbionixtech.com,https://www.netr-ai.orbionixtech.com,https://localhost,capacitor://localhost",
    [string]$ModelVersion = "aptos-baseline-v1",
    [int]$MinInstances = 0,
    [int]$MaxInstances = 3,
    [string]$Cpu = "1",
    [string]$Memory = "1Gi",
    [int]$Concurrency = 4,
    [string]$ApiAccessKey = $env:NETRAI_API_ACCESS_KEY,
    [switch]$SkipModelUpload
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

function Test-GcloudExists {
    & gcloud @args *> $null
    return $LASTEXITCODE -eq 0
}

$activeAccount = & gcloud auth list --filter=status:ACTIVE --format="value(account)"
if ($LASTEXITCODE -ne 0 -or -not $activeAccount) {
    throw "No active gcloud account. Run: gcloud auth login"
}

$modelGcsUri = if ($InferenceMode -eq "onnx") { "gs://$ModelBucket/models/dr_classifier.onnx" } else { "" }

if ($InferenceMode -eq "onnx") {
    $localModelPath = Join-Path $BackendDir "models\dr_classifier.onnx"
    if (-not $SkipModelUpload -and -not (Test-Path -LiteralPath $localModelPath)) {
        throw "ONNX model not found at $localModelPath. Train/export from MATLAB first or deploy with -InferenceMode stub."
    }

    if ($SkipModelUpload) {
        if (-not (Test-GcloudExists storage objects describe $modelGcsUri --project $ProjectId)) {
            throw "SkipModelUpload was requested, but model was not found at $modelGcsUri"
        }
        Write-Host "Skipping ONNX model upload; using existing model at $modelGcsUri"
    } else {
        Write-Host "Uploading ONNX model to Cloud Storage..."
        Invoke-Gcloud storage cp $localModelPath $modelGcsUri
    }
    $ModelVersion = "aptos-baseline-v1"
} else {
    $ModelVersion = "demo-stub-v0"
}

$serviceAccountEmail = "$ServiceAccountName@$ProjectId.iam.gserviceaccount.com"

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
    MODEL_OUTPUT_FORMAT = "probabilities"
    MODEL_CHANNEL_ORDER = "rgb"
    MODEL_LAYOUT = "auto"
    MODEL_INPUT_SCALE = "0_1"
    MODEL_APPLY_CLAHE = "true"
    MODEL_REFERABLE_THRESHOLD = "0.50"
    QUALITY_MIN_FOCUS_SCORE = "1.0"
    QUALITY_MIN_BRIGHTNESS = "0.15"
    QUALITY_MAX_BRIGHTNESS = "0.90"
    QUALITY_MIN_CONTRAST = "0.05"
    QUALITY_MIN_COMPATIBILITY_SCORE = "0.55"
    QUALITY_MAX_EDGE_ARTIFACT_RATIO = "0.52"
    QUALITY_MAX_GREEN_DOMINANCE_RATIO = "0.42"
    MAX_UPLOAD_BYTES = "20971520"
    MAX_IMAGE_PIXELS = "25000000"
}

if ($ApiAccessKey) {
    $envVars.API_ACCESS_KEY = $ApiAccessKey
}

$envVarsFile = Join-Path $env:CLOUDSDK_CONFIG "cloud-run-env.yaml"
$envFileLines = foreach ($entry in $envVars.GetEnumerator()) {
    $escapedValue = ([string]$entry.Value).Replace("\", "\\").Replace('"', '\"')
    "$($entry.Key): ""$escapedValue"""
}
Set-Content -Path $envVarsFile -Value $envFileLines -Encoding utf8

Write-Host "Deploying $ServiceName to Cloud Run in $Region..."
Write-Host "Inference mode: $InferenceMode"
Write-Host "Model version:  $ModelVersion"
Write-Host "Scaling:        min=$MinInstances max=$MaxInstances concurrency=$Concurrency"
Write-Host "Resources:      cpu=$Cpu memory=$Memory"
if ($modelGcsUri) {
    Write-Host "Model GCS URI:  $modelGcsUri"
}
Invoke-Gcloud run deploy $ServiceName `
    --source $BackendDir `
    --region $Region `
    --project $ProjectId `
    --service-account $serviceAccountEmail `
    --allow-unauthenticated `
    --memory $Memory `
    --cpu $Cpu `
    --cpu-throttling `
    --concurrency $Concurrency `
    --min-instances $MinInstances `
    --max-instances $MaxInstances `
    --env-vars-file $envVarsFile `
    --quiet

Write-Host ""
Write-Host "Deployment complete. Copy the Cloud Run URL and use it as VITE_API_BASE_URL for Cloudflare Pages."
Write-Host "Cost-saving default is min instances = 0. For a live demo, redeploy temporarily with -MinInstances 1 if you need warmer startup."
