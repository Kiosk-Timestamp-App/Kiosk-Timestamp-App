<#
.SYNOPSIS
  Startet den Solar-Kiosk (fertiger Build aus ./out) auf Port 9000 – für den TV: http://192.168.1.100:9000
  Wird von der geplanten Aufgabe "OEKOVOLT Kiosk NextJS" beim Systemstart aufgerufen (wie "OEKOVOLT Zeit Frontend").
  Nach Codeänderungen nur neu bauen (npm run build) – der laufende Server liefert den neuen Build sofort aus.
#>
param([int]$Port = 9000)
$fe = Split-Path $PSScriptRoot -Parent
$logDir = Join-Path $fe 'logs'
New-Item -ItemType Directory -Force $logDir | Out-Null
$log = Join-Path $logDir 'kiosk.log'
$env:Path = "C:\Program Files\nodejs;$env:Path"
Set-Location $fe
# Watchdog: nach jedem Ende (Absturz, Port noch belegt) nach 5 s neu starten.
# Beenden nur über Stop-ScheduledTask "OEKOVOLT Kiosk NextJS".
while ($true) {
  & 'C:\Program Files\nodejs\node.exe' 'scripts\serve-out.mjs' $Port *>> $log
  Add-Content -Path $log -Value "$(Get-Date -Format s) Kiosk-Server beendet (Exit $LASTEXITCODE) - Neustart in 5 s"
  Start-Sleep -Seconds 5
}
