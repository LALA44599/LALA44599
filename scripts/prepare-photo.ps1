#requires -PSEdition Desktop

param(
  [string]$Source = 'C:\Users\lbernard\Pictures\1677333553548.jpg',
  [string]$Destination = (Join-Path $PSScriptRoot '..\assets\profile.jpg')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$approvedSourceHash = '430B83B8ACC6CE79DCCA76A86E3D7E9286D4F3286C0BD6D1B1EF1E34931E008D'

if (-not (Test-Path -LiteralPath $Source)) {
  throw "Approved portrait not found: $Source"
}

$sourcePath = [System.IO.Path]::GetFullPath($Source)
$destinationPath = [System.IO.Path]::GetFullPath($Destination)
if ([string]::Equals($sourcePath, $destinationPath, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Source and destination must be different files: $sourcePath"
}
[System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($destinationPath)) | Out-Null
$actualSourceHash = (Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash
if ($actualSourceHash -ne $approvedSourceHash) {
  throw "Approved portrait content hash mismatch: expected $approvedSourceHash, got $actualSourceHash"
}

$sourceImage = $null
$bitmap = $null
$graphics = $null
$codec = $null
$parameters = $null
$qualityParameter = $null
$output = $null
$publicationCompleted = $false
$temporaryPath = "$destinationPath.$([Guid]::NewGuid().ToString('N')).tmp"
$backupPath = "$destinationPath.$([Guid]::NewGuid().ToString('N')).bak"
try {
  $sourceImage = [System.Drawing.Image]::FromFile($sourcePath)
  $bitmap = [System.Drawing.Bitmap]::new(400, 400)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::Black)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $cropSize = [Math]::Min($sourceImage.Width, $sourceImage.Height)
  $cropX = [Math]::Floor(($sourceImage.Width - $cropSize) / 2)
  $cropY = [Math]::Floor(($sourceImage.Height - $cropSize) / 2)
  $sourceRect = [System.Drawing.Rectangle]::new($cropX, $cropY, $cropSize, $cropSize)
  $targetRect = [System.Drawing.Rectangle]::new(0, 0, 400, 400)
  $graphics.DrawImage($sourceImage, $targetRect, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
  $parameters = [System.Drawing.Imaging.EncoderParameters]::new(1)
  $qualityParameter = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, 88L)
  $parameters.Param[0] = $qualityParameter
  $bitmap.Save($temporaryPath, $codec, $parameters)

  $output = [System.Drawing.Image]::FromFile($temporaryPath)
  if ($output.Width -ne 400 -or $output.Height -ne 400) { throw 'Portrait dimensions are invalid' }
  $output.Dispose()
  $output = $null
  $qualityParameter.Dispose()
  $qualityParameter = $null
  $parameters.Dispose()
  $parameters = $null
  $graphics.Dispose()
  $graphics = $null
  $bitmap.Dispose()
  $bitmap = $null
  $sourceImage.Dispose()
  $sourceImage = $null

  if ([System.IO.File]::Exists($destinationPath)) {
    [System.IO.File]::Replace($temporaryPath, $destinationPath, $backupPath, $false)
    $publicationCompleted = $true
    if ([System.IO.File]::Exists($backupPath)) { [System.IO.File]::Delete($backupPath) }
  } else {
    [System.IO.File]::Move($temporaryPath, $destinationPath)
    $publicationCompleted = $true
  }
} finally {
  if ($output -ne $null) { $output.Dispose() }
  if ($qualityParameter -ne $null) { $qualityParameter.Dispose() }
  if ($parameters -ne $null) { $parameters.Dispose() }
  if ($codec -ne $null -and $codec -is [System.IDisposable]) { $codec.Dispose() }
  if ($graphics -ne $null) { $graphics.Dispose() }
  if ($bitmap -ne $null) { $bitmap.Dispose() }
  if ($sourceImage -ne $null) { $sourceImage.Dispose() }
  if (-not $publicationCompleted -and -not [System.IO.File]::Exists($destinationPath) -and [System.IO.File]::Exists($backupPath)) {
    [System.IO.File]::Move($backupPath, $destinationPath)
  }
  if ([System.IO.File]::Exists($temporaryPath) -and ([System.IO.File]::Exists($destinationPath) -or [System.IO.File]::Exists($backupPath))) {
    [System.IO.File]::Delete($temporaryPath)
  }
  if ($publicationCompleted -and [System.IO.File]::Exists($backupPath)) { [System.IO.File]::Delete($backupPath) }
}
