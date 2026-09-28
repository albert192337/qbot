$ErrorActionPreference = 'Stop'
$characterRoot = Join-Path $env:APPDATA '@qbot/app/characters/53ed5068-dd60-4e2a-82c7-fb94250369d1'
$repairRoot = $PSScriptRoot
$backupRoot = Join-Path $repairRoot ('backup-' + (Get-Date -Format yyyyMMdd-HHmmss))
$manifest = Get-Content -LiteralPath (Join-Path $characterRoot 'manifest.json') -Raw | ConvertFrom-Json
if ($manifest.name -ne '张起灵' -or $manifest.actions.perch.webm -ne 'actions/perch.webm') { throw 'Unexpected target character' }
New-Item -ItemType Directory -Path $backupRoot | Out-Null
foreach ($ext in @('webm','gif')) {
  $target = Join-Path $characterRoot "actions/perch.$ext"
  $source = Join-Path $repairRoot "repaired/actions/perch.$ext"
  Copy-Item -LiteralPath $target -Destination (Join-Path $backupRoot "perch.$ext")
  Copy-Item -LiteralPath $source -Destination "$target.repair"
  Move-Item -LiteralPath "$target.repair" -Destination $target -Force
  if ((Get-FileHash -LiteralPath $source).Hash -ne (Get-FileHash -LiteralPath $target).Hash) { throw 'Installed asset checksum mismatch' }
}
Copy-Item -LiteralPath (Join-Path $repairRoot 'perch.mp4') -Destination (Join-Path $characterRoot '.job/perch.mp4')
@{character=$characterRoot;backup=$backupRoot;installed=(Get-Date).ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $repairRoot 'installed.json')
Write-Output "Installed repaired WebM/GIF; original assets backed up to $backupRoot"
