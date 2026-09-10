param([ValidateSet('dev','preview','build')][string]$Mode='preview')
$ErrorActionPreference='Stop'
$taskRoot=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $taskRoot
$taskCandidates=@()
$taskNodeCommand=Get-Command node -ErrorAction SilentlyContinue
if($taskNodeCommand){$taskCandidates+=$taskNodeCommand.Source}
$taskCandidates+=Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$taskNode=$null
foreach($taskCandidate in $taskCandidates){
 if(Test-Path -LiteralPath $taskCandidate){
  $taskMajor=& $taskCandidate -p 'Number(process.versions.node.split(".")[0])'
  if([int]$taskMajor -ge 22){$taskNode=$taskCandidate;break}
 }
}
if(-not $taskNode){throw 'Node.js 22.13+ is required. Install Node.js LTS, then run this script again.'}
if(-not (Test-Path 'node_modules/vite/bin/vite.js')){throw 'Dependencies are missing. With Node.js 22.13+, run npm ci first.'}
Write-Host "Node: $taskNode"
if($Mode -eq 'build'){
 & $taskNode node_modules/typescript/bin/tsc --noEmit
 if($LASTEXITCODE){exit $LASTEXITCODE}
 & $taskNode node_modules/vite/bin/vite.js build
}elseif($Mode -eq 'dev'){
 & $taskNode node_modules/vite/bin/vite.js --host 127.0.0.1
}else{
 if(-not (Test-Path 'dist/index.html')){throw 'Run scripts/start.ps1 -Mode build first.'}
 Write-Host 'Open http://127.0.0.1:5178/  |  Ctrl+C stops the server.'
 & $taskNode node_modules/vite/bin/vite.js preview --host 127.0.0.1
}
exit $LASTEXITCODE
