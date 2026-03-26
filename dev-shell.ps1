$nodeDir = Join-Path $env:LOCALAPPDATA 'Programs\nodejs'
$gitCmdDir = Join-Path $env:LOCALAPPDATA 'Programs\Git\cmd'
$gitUsrBinDir = Join-Path $env:LOCALAPPDATA 'Programs\Git\usr\bin'
$pythonDir = Join-Path $env:LOCALAPPDATA 'Programs\Python\Python314'
$pythonScriptsDir = Join-Path $pythonDir 'Scripts'

$toolPaths = @(
  $nodeDir,
  $gitCmdDir,
  $gitUsrBinDir,
  $pythonDir,
  $pythonScriptsDir
) | Where-Object { Test-Path $_ }

foreach ($path in ($toolPaths | Select-Object -Unique)) {
  if (-not (($env:Path -split ';') -contains $path)) {
    $env:Path = "$path;$env:Path"
  }
}

Write-Host "Toolchain configured for this shell:"
if (Test-Path (Join-Path $nodeDir 'node.exe')) {
  Write-Host "Node   $(& (Join-Path $nodeDir 'node.exe') -v)"
}
if (Test-Path (Join-Path $nodeDir 'npm.cmd')) {
  Write-Host "npm    $(& (Join-Path $nodeDir 'npm.cmd') -v)"
}
if (Test-Path (Join-Path $gitCmdDir 'git.exe')) {
  Write-Host "Git    $(& (Join-Path $gitCmdDir 'git.exe') --version)"
}
if (Test-Path (Join-Path $pythonDir 'python.exe')) {
  Write-Host "Python $(& (Join-Path $pythonDir 'python.exe') --version)"
}
