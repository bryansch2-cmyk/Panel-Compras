$backendPath = "C:\Users\Usuario\Desktop\Fortnitebot\panel-compras-web\backend"
$nodePath = "C:\Program Files\nodejs\node.exe"

if (-not (Test-Path $nodePath)) {
  Write-Host "No se encontro Node.js en: $nodePath"
  exit 1
}

Set-Location $backendPath
& $nodePath server.js
