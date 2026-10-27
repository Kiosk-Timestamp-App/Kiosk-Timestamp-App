<#
.SYNOPSIS
  Lokale Stempel-QR-Brücke auf http://localhost:8091 gegen den Frappe auf Hetzner (zeit-de).
  Startet das ÖKOVOLT-Zeit-Frontend (Pictures\Zeiterfassuing\frontend) ein zweites Mal – die lokale Zeiterfassung (Port 8090) bleibt unverändert.
  Einstellungen (FRAPPE_URL, DISPLAY_KIOSK_API_KEY/-SECRET, DISPLAY_QR_TENANT) aus frontend-nextjs\.env.qr-bridge.local
  (nicht eingecheckt); sie überschreiben .env.local der Zeiterfassung nur für diese Instanz.
  Kiosk dazu: NEXT_PUBLIC_ZEIT_URL=http://localhost:8091 in frontend-nextjs/.env.local. Beenden: Strg+C.
#>
param(
  [int]$Port = 8091,
  [string]$EnvFile = (Join-Path $PSScriptRoot '..\.env.qr-bridge.local')
)
Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$') { Set-Item "env:$($Matches[1])" $Matches[2] }
}
if (-not $env:DISPLAY_KIOSK_API_KEY -or -not $env:DISPLAY_KIOSK_API_SECRET) { throw "DISPLAY_KIOSK_API_KEY/-SECRET fehlen in $EnvFile" }
$env:NODE_ENV = 'production'

Set-Location 'C:\Users\Administrator\Pictures\Zeiterfassuing\frontend'
& 'C:\Program Files\nodejs\node.exe' 'node_modules\next\dist\bin\next' start -p $Port -H 0.0.0.0
