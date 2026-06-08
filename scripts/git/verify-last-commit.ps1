$ErrorActionPreference = "Stop"

$raw = git cat-file -p HEAD
$patterns = @(
    '(?i)^co-authored-by:.*cursor',
    '(?i)^made-with:.*cursor',
    '(?i)^made with cursor'
)

foreach ($line in ($raw -split "`n")) {
    foreach ($pattern in $patterns) {
        if ($line -match $pattern) {
            Write-Error "Last commit contains AI attribution: $line"
        }
    }
}

Write-Host "Last commit message is clean (no Cursor attribution)."
