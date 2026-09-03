#requires -PSEdition Desktop

$ErrorActionPreference = 'Stop'
$scriptPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\scripts\prepare-photo.ps1'))
$approved = 'C:\Users\lbernard\Pictures\1677333553548.jpg'
$root = Join-Path ([IO.Path]::GetTempPath()) "portrait-safety-$([Guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $root | Out-Null

function Hash([string]$Path) { (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash }
function Invoke-Generator([string]$Source, [string]$Destination) {
  $previous = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  & powershell -ExecutionPolicy Bypass -File $scriptPath -Source $Source -Destination $Destination 1>$null 2>$null
  $code = $LASTEXITCODE
  $ErrorActionPreference = $previous
  return $code
}
function Assert([bool]$Condition, [string]$Message) { if (-not $Condition) { throw $Message } }

try {
  $sourceCopy = Join-Path $root 'source.jpg'
  $destination = Join-Path $root 'destination.jpg'
  Copy-Item -LiteralPath $approved -Destination $sourceCopy
  Copy-Item -LiteralPath $approved -Destination $destination

  $bytes = [IO.File]::ReadAllBytes($sourceCopy)
  $bytes[100] = $bytes[100] -bxor 1
  [IO.File]::WriteAllBytes($sourceCopy, $bytes)
  $before = Hash $destination
  Assert ((Invoke-Generator $sourceCopy $destination) -ne 0) 'wrong-hash source unexpectedly succeeded'
  Assert ((Hash $destination) -eq $before) 'wrong-hash source changed destination'

  Copy-Item -LiteralPath $approved -Destination $sourceCopy -Force
  $before = Hash $sourceCopy
  Assert ((Invoke-Generator $sourceCopy $sourceCopy) -ne 0) 'same-path source unexpectedly succeeded'
  Assert ((Hash $sourceCopy) -eq $before) 'same-path invocation changed source copy'

  Copy-Item -LiteralPath $approved -Destination $sourceCopy -Force
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot '..\assets\profile.jpg') -Destination $destination -Force
  $before = Hash $destination
  $lock = [IO.File]::Open($destination, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::None)
  try {
    Assert ((Invoke-Generator $sourceCopy $destination) -ne 0) 'locked replacement unexpectedly succeeded'
  } finally {
    $lock.Dispose()
  }
  Assert ((Hash $destination) -eq $before) 'replacement failure lost original destination'
  $probe = [IO.File]::Open($sourceCopy, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::None)
  $probe.Dispose()
  'photo-safety=ok'
} finally {
  if (Test-Path -LiteralPath $root) { Remove-Item -LiteralPath $root -Recurse -Force }
}
