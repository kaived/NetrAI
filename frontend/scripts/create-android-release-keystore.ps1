param(
    [string]$Alias = "netrai-release",
    [string]$DName = "CN=NetrAI, OU=RetinaScan AI, O=OrbionixTech, L=Kolkata, ST=West Bengal, C=IN",
    [int]$ValidityDays = 10000
)

$ErrorActionPreference = "Stop"

$FrontendRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$AndroidRoot = Join-Path $FrontendRoot "android"
$SigningDir = Join-Path $AndroidRoot "signing"
$KeystorePath = Join-Path $SigningDir "netrai-release.jks"
$PropertiesPath = Join-Path $SigningDir "netrai-release.properties"

if (Test-Path -LiteralPath $KeystorePath) {
    throw "Release keystore already exists at $KeystorePath. Keep it safe; Android updates must be signed with the same key."
}

$keytool = Get-Command keytool -ErrorAction SilentlyContinue
if (-not $keytool) {
    throw "keytool was not found. Install a JDK or open Android Studio once, then rerun this script."
}

New-Item -ItemType Directory -Force -Path $SigningDir | Out-Null

$StorePassword = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
$KeyPassword = $StorePassword

& $keytool.Source `
    -genkeypair `
    -v `
    -keystore $KeystorePath `
    -storepass $StorePassword `
    -keypass $KeyPassword `
    -alias $Alias `
    -keyalg RSA `
    -keysize 2048 `
    -validity $ValidityDays `
    -dname $DName

if ($LASTEXITCODE -ne 0) {
    throw "keytool failed to create the release keystore."
}

$relativeKeystore = "signing/netrai-release.jks"
$properties = @(
    "storeFile=$relativeKeystore",
    "storePassword=$StorePassword",
    "keyAlias=$Alias",
    "keyPassword=$KeyPassword"
)
Set-Content -Path $PropertiesPath -Value $properties -Encoding ASCII

Write-Host "Created Android release signing files:"
Write-Host "Keystore:   $KeystorePath"
Write-Host "Properties: $PropertiesPath"
Write-Host ""
Write-Host "Do not commit these files. Back them up securely; losing the keystore prevents APK updates over the existing installed app."
