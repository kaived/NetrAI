param(
    [string]$ProjectId = "retinascan-ai-f620e",
    [string]$Location = "asia-south1",
    [string]$Bucket = "$ProjectId-app-downloads",
    [string]$ApkPath = "",
    [string]$ObjectPath = "android/netrai-latest.apk"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
if (-not $ApkPath) {
    $ApkPath = Join-Path $RepoRoot "frontend\android\app\build\outputs\apk\release\app-release.apk"
}

if (-not (Test-Path -LiteralPath $ApkPath)) {
    throw "Signed release APK not found at $ApkPath. Build it first with: cd frontend; npm run android:apk"
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

function Get-ApkSha256 {
    param([string]$Path)

    if (Get-Command Get-FileHash -ErrorAction SilentlyContinue) {
        return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash
    }

    $stream = [System.IO.File]::OpenRead($Path)
    try {
        $sha = [System.Security.Cryptography.SHA256]::Create()
        try {
            $hashBytes = $sha.ComputeHash($stream)
            return ([BitConverter]::ToString($hashBytes) -replace "-", "").ToUpperInvariant()
        } finally {
            $sha.Dispose()
        }
    } finally {
        $stream.Dispose()
    }
}

$activeAccount = & gcloud auth list --filter=status:ACTIVE --format="value(account)"
if ($LASTEXITCODE -ne 0 -or -not $activeAccount) {
    throw "No active gcloud account. Run: .\infra\gcp\login.ps1"
}

Write-Host "Publishing Android APK..."
Write-Host "Project: $ProjectId"
Write-Host "Bucket:  gs://$Bucket"
Write-Host "APK:     $ApkPath"

if (-not (Test-GcloudExists storage buckets describe "gs://$Bucket" --project $ProjectId)) {
    Invoke-Gcloud storage buckets create "gs://$Bucket" `
        --project $ProjectId `
        --location $Location `
        --no-uniform-bucket-level-access `
        --no-public-access-prevention
} else {
    Invoke-Gcloud storage buckets update "gs://$Bucket" `
        --no-uniform-bucket-level-access `
        --no-public-access-prevention
}

$sha256 = Get-ApkSha256 -Path $ApkPath
Invoke-Gcloud storage cp $ApkPath "gs://$Bucket/$ObjectPath" `
    --content-type "application/vnd.android.package-archive" `
    --cache-control "public,max-age=300"

Invoke-Gcloud storage objects update "gs://$Bucket/$ObjectPath" `
    --add-acl-grant "entity=AllUsers,role=READER" `
    --content-type "application/vnd.android.package-archive" `
    --cache-control "public,max-age=300"

Write-Host ""
Write-Host "Android APK URL:"
Write-Host "https://storage.googleapis.com/$Bucket/$ObjectPath"
Write-Host ""
Write-Host "APK SHA256:"
Write-Host $sha256
Write-Host ""
Write-Host "Set this in Cloudflare Pages:"
Write-Host "VITE_ANDROID_APK_URL=https://storage.googleapis.com/$Bucket/$ObjectPath"
