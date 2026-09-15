# Auto sync Windows date/time on logon / unlock / startup
# Logs to sync-time.log in same folder so you can verify it ran
$logFile = Join-Path $PSScriptRoot "sync-time.log"
function Log($msg) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg"
  Write-Host $line
  try { Add-Content -Path $logFile -Value $line -Encoding UTF8 } catch {}
}

try {
  Log "⏰ Sync triggered (user=$env:USERNAME admin=$(([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)))"
  Log "Before: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

  # Ensure Windows Time service is running (needs admin/SYSTEM - task runs as SYSTEM)
  try {
    $svc = Get-Service w32time -ErrorAction Stop
    if ($svc.Status -ne "Running") {
      Log "Starting w32time service..."
      Start-Service w32time -ErrorAction Stop
      Start-Sleep -Seconds 2
    }
    # Auto-start on boot so it never stays stopped
    Set-Service w32time -StartupType Automatic -ErrorAction SilentlyContinue
  } catch {
    Log "⚠️ Could not start w32time: $($_.Exception.Message)"
  }

  # Force resync with internet time server
  $out1 = w32tm /resync /force 2>&1 | Out-String
  Log "w32tm /resync => $out1 (exit=$LASTEXITCODE)"

  if ($LASTEXITCODE -ne 0 -or $out1 -match "error|failed|denied|not.*start") {
    Log "Retrying with time.windows.com..."
    w32tm /config /manualpeerlist:"time.windows.com,0x1" /syncfromflags:manual /reliable:yes /update 2>&1 | Out-String | ForEach-Object { Log $_ }
    try { Restart-Service w32time -Force -ErrorAction Stop } catch { Log "restart failed: $($_.Exception.Message)" }
    Start-Sleep -Seconds 3
    $out2 = w32tm /resync /force 2>&1 | Out-String
    Log "retry w32tm /resync => $out2 (exit=$LASTEXITCODE)"
  }

  try {
    $st = w32tm /query /status 2>&1 | Out-String
    Log "status: $($st -replace '\r?\n',' | ')"
  } catch {}

  Log "✅ After: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
} catch {
  Log "❌ Sync failed: $($_.Exception.Message)"
  Log "Run setup-time-sync.ps1 as Administrator once"
}
