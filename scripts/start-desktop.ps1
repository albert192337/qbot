$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$electronPath = Join-Path $projectRoot 'node_modules/electron/dist/electron.exe'
$appDirectory = Join-Path $projectRoot 'app'
if (!(Test-Path -LiteralPath $electronPath) -or !(Test-Path -LiteralPath (Join-Path $appDirectory 'out/main/index.js'))) {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show('请先在项目目录运行 npm install 和 npm run build，再启动 QBot。', 'QBot') | Out-Null
    exit 1
}
# Start the built app from its permanent checkout, retaining the normal userData.
# Remove inherited test/dev addresses so the shortcut always has predictable behavior.
Remove-Item Env:ELECTRON_RENDERER_URL -ErrorAction SilentlyContinue
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
Remove-Item Env:QBOT_ROOMS_URL -ErrorAction SilentlyContinue
Start-Process -FilePath $electronPath -ArgumentList ('"' + $appDirectory + '"') -WorkingDirectory $appDirectory -WindowStyle Hidden
