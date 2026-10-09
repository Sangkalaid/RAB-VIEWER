param(
  [switch]$PushOnly,
  [switch]$Deploy,
  [switch]$RunTest
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$GasDir = Join-Path $Root "api\google-apps-script"
$ClaspPath = Join-Path $GasDir ".clasp.json"

function Fail($Message) {
  Write-Error $Message
  exit 1
}

if (-not $env:GAS_STAGING_SCRIPT_ID) {
  Fail "Set GAS_STAGING_SCRIPT_ID to the existing Apps Script project scriptId. This is not the /exec deployment id."
}

$clasp = @{
  scriptId = $env:GAS_STAGING_SCRIPT_ID
  rootDir = "."
} | ConvertTo-Json -Depth 5
Set-Content -Path $ClaspPath -Value $clasp -Encoding UTF8

Push-Location $Root
try {
  npm run lint
  npm run test:ahsp-unit
  npm run gas:validate

  npx clasp status -P $GasDir
  npx clasp push -P $GasDir

  if ($PushOnly -and -not $Deploy) {
    Write-Host "GAS push PASS"
    exit 0
  }

  if (-not $env:GAS_STAGING_DEPLOYMENT_ID) {
    Fail "Set GAS_STAGING_DEPLOYMENT_ID to the existing staging deployment id before redeploying."
  }

  $description = "RAB VIEWER staging $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
  $versionOutput = npx clasp version -P $GasDir $description
  Write-Host $versionOutput
  $versionNumber = ($versionOutput | Select-String -Pattern "\d+" -AllMatches).Matches | Select-Object -Last 1 | ForEach-Object { $_.Value }
  if (-not $versionNumber) {
    Fail "Could not parse Apps Script version number from clasp output."
  }

  npx clasp redeploy -P $GasDir $env:GAS_STAGING_DEPLOYMENT_ID -V $versionNumber -d $description

  if (-not $env:GAS_STAGING_EXEC_URL) {
    Write-Warning "GAS_STAGING_EXEC_URL not set; skipping health check."
  } else {
    npm run gas:health
    if ($RunTest) {
      npm run gas:test:staging
    }
  }
}
finally {
  Pop-Location
}
