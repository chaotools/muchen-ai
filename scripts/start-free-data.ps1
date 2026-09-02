$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$venvPath = Join-Path $repoRoot ".venv-free-data"
$pythonPath = Join-Path $venvPath "Scripts\python.exe"
$requirementsPath = Join-Path $repoRoot "services\requirements.txt"
$requirementsStampPath = Join-Path $venvPath ".requirements.sha256"
$createdVenv = $false

if (-not (Test-Path -LiteralPath $pythonPath)) {
    py -m venv $venvPath
    & $pythonPath -m pip install --upgrade pip
    $createdVenv = $true
}

$requirementsHash = (Get-FileHash -LiteralPath $requirementsPath -Algorithm SHA256).Hash
$installedRequirementsHash = if (Test-Path -LiteralPath $requirementsStampPath) {
    (Get-Content -LiteralPath $requirementsStampPath -Raw).Trim()
} else {
    ""
}

if ($createdVenv -or $installedRequirementsHash -ne $requirementsHash) {
    & $pythonPath -m pip install -r $requirementsPath
    Set-Content -LiteralPath $requirementsStampPath -Value $requirementsHash -NoNewline
}

& $pythonPath (Join-Path $repoRoot "services\muchen_free_data.py")
