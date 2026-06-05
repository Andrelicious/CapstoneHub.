<#
PowerShell helper: Update WSL2 kernel, enable required Windows features, and (optionally) install Ubuntu.
Run this script as Administrator. The script will attempt to relaunch itself elevated if needed.

Usage (from repo root):
  Right-click PowerShell -> Run as administrator, then:
    Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
    .\scripts\update-wsl-and-docker.ps1

Note: This script makes system changes and may require a reboot.
#>

function Test-IsAdmin {
    $current = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($current)
    return $principal.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
}

# Relaunch elevated if required
if (-not (Test-IsAdmin)) {
    Write-Host "Script is not running as Administrator. Relaunching as Administrator..." -ForegroundColor Yellow
    Start-Process -FilePath "powershell" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit 0
}

Write-Host "Running as Administrator. Beginning WSL/Docker prerequisites update..." -ForegroundColor Green

# Enable WSL and Virtual Machine Platform features (no restart requested here)
try {
    Write-Host "Enabling WSL feature and Virtual Machine Platform (may be no-op if already enabled)..."
    dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart | Out-Null
    dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart | Out-Null
    Write-Host "Feature enable commands completed." -ForegroundColor Green
} catch {
    Write-Host "Failed to enable features via DISM: $_" -ForegroundColor Red
}

# Update WSL kernel
try {
    Write-Host "Updating WSL kernel (this may take a minute)..."
    wsl --update
    Write-Host "WSL kernel update finished." -ForegroundColor Green
} catch {
    Write-Host "Warning: 'wsl --update' failed or is not available: $_" -ForegroundColor Yellow
}

# Set default WSL version to 2
try {
    Write-Host "Setting default WSL version to 2..."
    wsl --set-default-version 2
    Write-Host "WSL default version set to 2." -ForegroundColor Green
} catch {
    Write-Host "Warning: failed to set default WSL version: $_" -ForegroundColor Yellow
}

# List distros
try {
    Write-Host "Installed WSL distros:"
    wsl --list --verbose
} catch {
    Write-Host "Could not list distros: $_" -ForegroundColor Yellow
}

# Optionally install Ubuntu if no distro exists
$distros = @()
try { $distros = (wsl --list --quiet) -split "\r?\n" | Where-Object { $_ -ne '' } } catch { }
if (-not $distros -or $distros.Count -eq 0) {
    Write-Host "No WSL distro detected. Installing Ubuntu (recommended) via wsl --install -d Ubuntu..." -ForegroundColor Cyan
    try {
        wsl --install -d Ubuntu
        Write-Host "Ubuntu installation requested. You may need to finish initial setup when Ubuntu launches." -ForegroundColor Green
    } catch {
        Write-Host "Failed to install Ubuntu automatically: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "WSL distro(s) detected; skipping automatic distro install." -ForegroundColor Green
}

Write-Host "\nIMPORTANT: A reboot may be required for some of these feature changes to take effect." -ForegroundColor Yellow
Write-Host "If the script or Docker Desktop still reports WSL issues, please reboot your machine and try again." -ForegroundColor Yellow

Write-Host "\nAfter reboot, start Docker Desktop and enable WSL integration (Settings → Resources → WSL Integration)." -ForegroundColor Cyan
Write-Host "Then verify by running: docker --version  and docker compose version" -ForegroundColor Cyan

Write-Host "Done." -ForegroundColor Green
