param(
    [switch]$SkipSync,
    [switch]$Clean,
    [string]$ApiBaseUrl = $env:VITE_API_BASE_URL,
    [string]$ApiAccessKey = ""
)

$ErrorActionPreference = "Stop"

$FrontendRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$AndroidRoot = Join-Path $FrontendRoot "android"
$SigningPropertiesPath = Join-Path $AndroidRoot "signing\netrai-release.properties"
$DefaultProductionApiBaseUrl = "https://retinascan-api-58990504584.asia-south1.run.app"

if (-not (Test-Path -LiteralPath $SigningPropertiesPath) -and -not $env:NETRAI_ANDROID_KEYSTORE) {
    throw "Android release signing is not configured. Run: .\scripts\create-android-release-keystore.ps1"
}

Push-Location $FrontendRoot
try {
    if ([string]::IsNullOrWhiteSpace($ApiBaseUrl) -or $ApiBaseUrl -match "^http://localhost(:\d+)?/?$" -or $ApiBaseUrl -match "^http://127\.0\.0\.1(:\d+)?/?$") {
        $env:VITE_API_BASE_URL = $DefaultProductionApiBaseUrl
    } else {
        $env:VITE_API_BASE_URL = $ApiBaseUrl
    }
    Write-Host "Android release API base URL: $env:VITE_API_BASE_URL"

    $resolvedApiAccessKey = $ApiAccessKey
    if ([string]::IsNullOrWhiteSpace($resolvedApiAccessKey)) {
        $resolvedApiAccessKey = $env:VITE_API_ACCESS_KEY
    }
    if ([string]::IsNullOrWhiteSpace($resolvedApiAccessKey)) {
        $resolvedApiAccessKey = $env:NETRAI_API_ACCESS_KEY
    }

    if ([string]::IsNullOrWhiteSpace($resolvedApiAccessKey)) {
        Write-Warning "Android release API access key is empty. Online APK mode will fail if Cloud Run API_ACCESS_KEY is enabled."
    } else {
        $env:VITE_API_ACCESS_KEY = $resolvedApiAccessKey.Trim()
        Write-Host "Android release API access key: configured"
    }

    if (-not $SkipSync) {
        npm run android:sync
        if ($LASTEXITCODE -ne 0) {
            throw "npm run android:sync failed."
        }
    }

    Push-Location $AndroidRoot
    try {
        if ($Clean) {
            .\gradlew.bat clean assembleRelease
        } else {
            .\gradlew.bat assembleRelease
        }
        if ($LASTEXITCODE -ne 0) {
            throw "Gradle release APK build failed."
        }
    } finally {
        Pop-Location
    }
} finally {
    Pop-Location
}

$ReleaseDir = Join-Path $AndroidRoot "app\build\outputs\apk\release"
$signedApk = Get-ChildItem -LiteralPath $ReleaseDir -Filter "*.apk" -File |
    Where-Object { $_.Name -notmatch "unsigned" } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $signedApk) {
    $unsignedApk = Get-ChildItem -LiteralPath $ReleaseDir -Filter "*unsigned*.apk" -File -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($unsignedApk) {
        throw "Gradle produced an unsigned APK at $($unsignedApk.FullName). Check frontend/android/signing/netrai-release.properties."
    }
    throw "Release APK was not found under $ReleaseDir"
}

Write-Host ""
Write-Host "Signed release APK:"
Write-Host $signedApk.FullName
