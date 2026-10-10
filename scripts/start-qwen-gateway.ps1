param([switch]$CopyToken)
$ErrorActionPreference = "Stop"
if ($env:OS -ne "Windows_NT") { throw "This helper uses Windows account encryption. Use run_qwen_gateway.py with a securely supplied token on other systems." }
$projectRoot = Split-Path -Parent $PSScriptRoot
$operatorDirectory = Join-Path $projectRoot "var\operator"
New-Item -ItemType Directory -Force $operatorDirectory | Out-Null
$tokenFile = Join-Path $operatorDirectory "qwen-gateway-token.dpapi"
if (!(Test-Path $tokenFile)) {
    $bytes = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    $gatewaySecret = [Convert]::ToBase64String($bytes)
    $secureSecret = ConvertTo-SecureString $gatewaySecret -AsPlainText -Force
    ConvertFrom-SecureString $secureSecret | Set-Content $tokenFile
} else {
    $secureSecret = Get-Content $tokenFile | ConvertTo-SecureString
}
$credential = New-Object System.Management.Automation.PSCredential("gateway", $secureSecret)
$env:BEISAWA_OLLAMA_GATEWAY_TOKEN = $credential.GetNetworkCredential().Password
$env:BEISAWA_GATEWAY_MODEL = "qwen2.5:3b"
if ($CopyToken) {
    Set-Clipboard -Value $env:BEISAWA_OLLAMA_GATEWAY_TOKEN
    Write-Host "Token copied to clipboard. Paste it into Render's OLLAMA_API_KEY secret field; never into chat."
}
$pythonPath = Join-Path $projectRoot ".venv\Scripts\python.exe"
if (!(Test-Path $pythonPath)) { Remove-Item Env:BEISAWA_OLLAMA_GATEWAY_TOKEN -ErrorAction SilentlyContinue; throw "Create the Python environment and install this project first; see docs/local-qwen.md." }
try { & $pythonPath (Join-Path $PSScriptRoot "run_qwen_gateway.py") }
finally { Remove-Item Env:BEISAWA_OLLAMA_GATEWAY_TOKEN -ErrorAction SilentlyContinue }
