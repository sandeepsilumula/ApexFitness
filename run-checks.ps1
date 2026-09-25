# ============================================================
# Multi-Stack Validation Harness
# Auto-generated -- adapts to detected stacks
# Detected: 
# ============================================================

`$failedStacks = @()
`$skippedStacks = @()
`$errorLog = ".\.claude\last_error.log"
if (Test-Path `$errorLog) { Remove-Item `$errorLog }

# Prerequisite tool checks
`$requiredTools = @{
    "node"     = @{ Cmd = "node";     Check = "node --version" }
    "python"   = @{ Cmd = "python";   Check = "python --version" }
    "go"       = @{ Cmd = "go";       Check = "go version" }
    "rust"     = @{ Cmd = "cargo";    Check = "cargo --version" }
    "java"     = @{ Cmd = "java";     Check = "java -version" }
    "terraform"= @{ Cmd = "terraform";Check = "terraform version" }
    "docker"   = @{ Cmd = "docker";   Check = "docker --version" }
    "dotnet"   = @{ Cmd = "dotnet";   Check = "dotnet --version" }
    "ruby"     = @{ Cmd = "ruby";     Check = "ruby --version" }
    "php"      = @{ Cmd = "php";      Check = "php --version" }
}

Write-Host ""
Write-Host "  Running Validation Gates..." -ForegroundColor Cyan
Write-Host ""
Write-Host "  Checking prerequisites..." -ForegroundColor Cyan

`$stacksToRun = @()
foreach ($stack in $detectedStacks) {
    if (`$requiredTools.ContainsKey(`$stack)) {
        `$tool = `$requiredTools[`$stack]
        try {
            `$null = Get-Command `$tool.Cmd -ErrorAction Stop
            if (`$true) {
                `$stacksToRun += `$stack
                Write-Host "    [OK] `$tool.Cmd found" -ForegroundColor Green
            }
        } catch {
            `$skippedStacks += `$stack
            Write-Host "    [SKIP] `$tool.Cmd not found -- `$stack validation skipped" -ForegroundColor Yellow
        }
    } else {
        `$stacksToRun += `$stack
    }
}

if (`$skippedStacks.Count -gt 0) {
    Write-Host ""
    Write-Host "  Skipped stacks (tools not installed): `$($skippedStacks -join ', ')" -ForegroundColor Yellow
}
Write-Host ""



Write-Host ""
if (`$failedStacks.Count -gt 0) {
    Write-Host "  [STATUS] FAILED -- `$($failedStacks.Count) stack(s) with errors: `$($failedStacks -join ', ')" -ForegroundColor Red
    exit 1
} else {
    Write-Host "  [STATUS] ALL GATES PASSED" -ForegroundColor Green
    exit 0
}