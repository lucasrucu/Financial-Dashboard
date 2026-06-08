$ErrorActionPreference = "Stop"

$repoRoot = git rev-parse --show-toplevel
$hooksDir = Join-Path $repoRoot ".git\hooks"
$scriptsDir = Join-Path $repoRoot "scripts\git"

foreach ($hook in @("prepare-commit-msg", "commit-msg")) {
    $source = Join-Path $scriptsDir $hook
    $target = Join-Path $hooksDir $hook

    if (-not (Test-Path $source)) {
        throw "Missing hook script: $source"
    }

    Copy-Item -Path $source -Destination $target -Force
}

Write-Host "Installed git hooks: prepare-commit-msg, commit-msg"
