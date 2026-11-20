param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$publicDir = Join-Path $ProjectRoot "public"
$iconsDir = Join-Path $publicDir "icons"
New-Item -ItemType Directory -Force -Path $iconsDir | Out-Null

# Detect user-provided source logo if present
$sourceCandidates = @(
  (Join-Path $publicDir "logo.png"),
  (Join-Path $publicDir "logo.jpg"),
  (Join-Path $publicDir "logo.jpeg")
)
$sourceFile = $sourceCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

function New-DefaultBrandBitmap {
  $size = 1024
  $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)

  # Rounded square emerald-to-teal court tile
  $rect = New-Object System.Drawing.RectangleF(32, 32, ($size - 64), ($size - 64))
  $radius = 220
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diam = $radius * 2
  $path.AddArc($rect.X, $rect.Y, $diam, $diam, 180, 90)
  $path.AddArc($rect.Right - $diam, $rect.Y, $diam, $diam, 270, 90)
  $path.AddArc($rect.Right - $diam, $rect.Bottom - $diam, $diam, $diam, 0, 90)
  $path.AddArc($rect.X, $rect.Bottom - $diam, $diam, $diam, 90, 90)
  $path.CloseFigure()

  $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.PointF(32, 32)),
    (New-Object System.Drawing.PointF(992, 992)),
    ([System.Drawing.Color]::FromArgb(255, 6, 95, 70)),
    ([System.Drawing.Color]::FromArgb(255, 13, 148, 136))
  )
  $g.FillPath($grad, $path)

  # Subtle inner court border line
  $courtPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(72, 255, 255, 255), 14)
  $innerRect = New-Object System.Drawing.RectangleF(128, 128, ($size - 256), ($size - 256))
  $g.DrawRectangle($courtPen, $innerRect.X, $innerRect.Y, $innerRect.Width, $innerRect.Height)
  $g.DrawLine($courtPen, 512, 128, 512, 896)

  # Crisp pulse wave through court center
  $pulsePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(245, 255, 255, 255), 52)
  $pulsePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pulsePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pulsePen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

  $pts = [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF(190, 560)),
    (New-Object System.Drawing.PointF(340, 560)),
    (New-Object System.Drawing.PointF(425, 320)),
    (New-Object System.Drawing.PointF(535, 725)),
    (New-Object System.Drawing.PointF(630, 415)),
    (New-Object System.Drawing.PointF(700, 560)),
    (New-Object System.Drawing.PointF(834, 560))
  )
  $g.DrawLines($pulsePen, $pts)

  # Shuttle head accent dot
  $mintBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 167, 243, 208))
  $g.FillEllipse($mintBrush, 720, 240, 110, 110)

  $mintBrush.Dispose()
  $pulsePen.Dispose()
  $courtPen.Dispose()
  $grad.Dispose()
  $path.Dispose()
  $g.Dispose()
  return $bmp
}

function Resize-SquareBitmap {
  param(
    [System.Drawing.Image]$Src,
    [int]$Size,
    [double]$PaddingRatio = 0.0,
    [System.Drawing.Color]$BgColor = [System.Drawing.Color]::Transparent
  )
  $bmp = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear($BgColor)

  $pad = [int][Math]::Round($Size * $PaddingRatio)
  $inner = $Size - (2 * $pad)
  $g.DrawImage($Src, $pad, $pad, $inner, $inner)
  $g.Dispose()
  return $bmp
}

function Save-MultiSizeIco {
  param(
    [System.Drawing.Image]$Src,
    [string]$OutPath
  )
  $icoSizes = @(16, 32, 48)
  $pngStreams = @()
  foreach ($s in $icoSizes) {
    $resized = Resize-SquareBitmap -Src $Src -Size $s
    $ms = New-Object System.IO.MemoryStream
    $resized.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $resized.Dispose()
    $pngStreams += ,@($s, $ms.ToArray())
    $ms.Dispose()
  }

  $fs = New-Object System.IO.FileStream($OutPath, [System.IO.FileMode]::Create)
  $bw = New-Object System.IO.BinaryWriter($fs)
  # ICONDIR header
  $bw.Write([UInt16]0)
  $bw.Write([UInt16]1)
  $bw.Write([UInt16]$pngStreams.Count)

  $offset = 6 + (16 * $pngStreams.Count)
  foreach ($entry in $pngStreams) {
    $sz = $entry[0]
    $bytes = $entry[1]
    $bw.Write([Byte]($(if ($sz -ge 256) { 0 } else { $sz })))
    $bw.Write([Byte]($(if ($sz -ge 256) { 0 } else { $sz })))
    $bw.Write([Byte]0)
    $bw.Write([Byte]0)
    $bw.Write([UInt16]1)
    $bw.Write([UInt16]32)
    $bw.Write([UInt32]$bytes.Length)
    $bw.Write([UInt32]$offset)
    $offset += $bytes.Length
  }
  foreach ($entry in $pngStreams) {
    $bw.Write($entry[1])
  }
  $bw.Flush()
  $bw.Dispose()
  $fs.Dispose()
}

function Save-SocialCard {
  param(
    [System.Drawing.Image]$Src,
    [string]$OutPath
  )
  $w = 1200
  $h = 630
  $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $bgGrad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.PointF(0, 0)),
    (New-Object System.Drawing.PointF($w, $h)),
    ([System.Drawing.Color]::FromArgb(255, 6, 78, 59)),
    ([System.Drawing.Color]::FromArgb(255, 15, 118, 110))
  )
  $g.FillRectangle($bgGrad, 0, 0, $w, $h)

  # Subtle court grid lines
  $linePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(30, 255, 255, 255), 3)
  $g.DrawRectangle($linePen, 48, 48, ($w - 96), ($h - 96))
  $g.DrawLine($linePen, 600, 48, 600, ($h - 48))

  # Emblem
  $g.DrawImage($Src, 110, 175, 260, 260)

  # Typography
  $titleFont = New-Object System.Drawing.Font("Segoe UI", 74, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $subFont = New-Object System.Drawing.Font("Segoe UI", 32, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $mintBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 209, 250, 229))

  $g.DrawString("CourtPulse", $titleFont, $whiteBrush, 420, 210)
  $g.DrawString("Badminton teams, live sessions & tournaments", $subFont, $mintBrush, 424, 315)

  $mintBrush.Dispose()
  $whiteBrush.Dispose()
  $subFont.Dispose()
  $titleFont.Dispose()
  $linePen.Dispose()
  $bgGrad.Dispose()
  $g.Dispose()

  $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

if ($sourceFile) {
  Write-Output "Generating brand icons from $sourceFile"
  $master = [System.Drawing.Image]::FromFile($sourceFile)
} else {
  Write-Output "No custom public/logo.png found; generating default CourtPulse emerald emblem icons"
  $master = New-DefaultBrandBitmap
}

$sizes = @(16, 32, 48, 72, 96, 128, 144, 152, 192, 256, 384, 512)
foreach ($sz in $sizes) {
  $out = Join-Path $iconsDir "icon-${sz}x${sz}.png"
  $resized = Resize-SquareBitmap -Src $master -Size $sz
  $resized.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $resized.Dispose()
}

# Maskable icon (safe padding on solid emerald court base)
$maskable = Resize-SquareBitmap -Src $master -Size 512 -PaddingRatio 0.14 -BgColor ([System.Drawing.Color]::FromArgb(255, 6, 95, 70))
$maskable.Save((Join-Path $iconsDir "maskable-512x512.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$maskable.Dispose()

# Apple touch icon (180x180 opaque background)
$apple = Resize-SquareBitmap -Src $master -Size 180 -PaddingRatio 0.06 -BgColor ([System.Drawing.Color]::FromArgb(255, 243, 246, 244))
$apple.Save((Join-Path $publicDir "apple-touch-icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$apple.Dispose()

# Favicon ICO (16, 32, 48)
Save-MultiSizeIco -Src $master -OutPath (Join-Path $publicDir "favicon.ico")

# OpenGraph and Twitter cards (1200x630)
Save-SocialCard -Src $master -OutPath (Join-Path $publicDir "og-image.png")
Save-SocialCard -Src $master -OutPath (Join-Path $publicDir "twitter-image.png")

$master.Dispose()
Write-Output "Generated all icons, favicon.ico, apple-touch-icon.png, og-image.png, twitter-image.png"
