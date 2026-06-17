param(
  [string]$InputJson = "_tmp_storybook_pages.json",
  [int]$Width = 1400,
  [int]$Height = 788
)

Add-Type -AssemblyName System.Drawing

function New-Color([int]$r, [int]$g, [int]$b, [int]$a = 255) {
  [System.Drawing.Color]::FromArgb($a, $r, $g, $b)
}

function New-Brush($color) {
  New-Object System.Drawing.SolidBrush $color
}

function New-Pen($color, [float]$width = 1) {
  $pen = New-Object System.Drawing.Pen $color, $width
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen
}

function Hash-Seed([string]$value) {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($value)
  $hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
  [BitConverter]::ToUInt32($hash, 0)
}

function Jitter([uint32]$seed, [int]$index, [int]$min, [int]$max) {
  $range = [Math]::Max(1, $max - $min + 1)
  $value = ($seed + 1103515245 * ($index + 3)) % [uint32]$range
  $min + [int]$value
}

function Fill-RoundRect($g, [System.Drawing.Brush]$brush, [float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  $g.FillPath($brush, $path)
  $path.Dispose()
}

function Draw-Background($g, $seed, [string]$mode) {
  $sky1 = New-Color (Jitter $seed 1 226 244) (Jitter $seed 2 232 248) (Jitter $seed 3 238 255)
  $sky2 = New-Color (Jitter $seed 4 246 255) (Jitter $seed 5 244 255) (Jitter $seed 6 238 252)
  $rect = New-Object System.Drawing.Rectangle 0,0,1400,788
  $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $sky1, $sky2, 90
  $g.FillRectangle($grad, $rect)
  $grad.Dispose()

  $floor = New-Brush (New-Color 231 226 216)
  if ($mode -eq "nature") { $floor = New-Brush (New-Color 204 224 193) }
  if ($mode -eq "water") { $floor = New-Brush (New-Color 184 215 226) }
  $g.FillRectangle($floor, 0, 520, 1400, 268)
  $floor.Dispose()
}

function Draw-Groningen-Street($g, $seed) {
  $brick = New-Brush (New-Color 165 82 57)
  $brick2 = New-Brush (New-Color 190 103 75)
  $roof = New-Brush (New-Color 84 69 62)
  for ($i = 0; $i -lt 6; $i++) {
    $x = 45 + $i * 205 + (Jitter $seed $i -10 14)
    $h = Jitter $seed (20 + $i) 190 290
    $w = Jitter $seed (30 + $i) 145 185
    $y = 520 - $h
    $g.FillRectangle($(if ($i % 2 -eq 0) { $brick } else { $brick2 }), $x, $y, $w, $h)
    $pts = [System.Drawing.Point[]]@(
      (New-Object System.Drawing.Point([int]($x - 8), [int]$y)),
      (New-Object System.Drawing.Point([int]($x + ($w / 2)), [int]($y - 50))),
      (New-Object System.Drawing.Point([int]($x + $w + 8), [int]$y))
    )
    $g.FillPolygon([System.Drawing.Brush]$roof, [System.Drawing.Point[]]$pts)
    $win = New-Brush (New-Color 236 244 248)
    for ($r = 0; $r -lt 3; $r++) {
      for ($c = 0; $c -lt 2; $c++) {
        $g.FillRectangle($win, $x + 28 + $c * 62, $y + 34 + $r * 58, 34, 34)
      }
    }
    $win.Dispose()
  }
  $brick.Dispose(); $brick2.Dispose(); $roof.Dispose()
}

function Draw-Canal($g, $seed) {
  $water = New-Brush (New-Color 94 147 168)
  $g.FillRectangle($water, 0, 525, 1400, 145)
  $water.Dispose()
  $pen = New-Pen (New-Color 232 241 245 150) 4
  for ($i = 0; $i -lt 9; $i++) {
    $y = 545 + $i * 14
    $g.DrawArc($pen, 80 + $i * 120, $y, 180, 24, 0, 170)
  }
  $pen.Dispose()
}

function Draw-Park($g, $seed) {
  $grass = New-Brush (New-Color 171 211 158)
  $g.FillRectangle($grass, 0, 440, 1400, 348)
  $grass.Dispose()
  $path = New-Brush (New-Color 216 198 168)
  $points = [System.Drawing.Point[]]@(
    (New-Object System.Drawing.Point(0, 720)),
    (New-Object System.Drawing.Point(460, 575)),
    (New-Object System.Drawing.Point(920, 575)),
    (New-Object System.Drawing.Point(1400, 720)),
    (New-Object System.Drawing.Point(1400, 788)),
    (New-Object System.Drawing.Point(0, 788))
  )
  $g.FillPolygon($path, $points)
  $path.Dispose()
  for ($i = 0; $i -lt 9; $i++) {
    Draw-Tree $g (70 + $i * 150) (390 + (Jitter $seed $i -20 35)) (Jitter $seed (80 + $i) 65 95)
  }
}

function Draw-Tree($g, [int]$x, [int]$y, [int]$s) {
  $trunk = New-Brush (New-Color 116 82 55)
  $leaf = New-Brush (New-Color 74 145 92)
  $g.FillRectangle($trunk, $x + $s / 2 - 8, $y + $s / 2, 16, $s)
  $g.FillEllipse($leaf, $x, $y, $s, $s)
  $g.FillEllipse($leaf, $x - 24, $y + 20, $s, $s)
  $g.FillEllipse($leaf, $x + 24, $y + 18, $s, $s)
  $trunk.Dispose(); $leaf.Dispose()
}

function Draw-Bicycle($g, [int]$x, [int]$y, [float]$scale) {
  $pen = New-Pen (New-Color 43 55 72) (3 * $scale)
  $r = 28 * $scale
  $g.DrawEllipse($pen, $x, $y, $r * 2, $r * 2)
  $g.DrawEllipse($pen, $x + 105 * $scale, $y, $r * 2, $r * 2)
  $g.DrawLine($pen, $x + $r, $y + $r, $x + 70 * $scale, $y + 10 * $scale)
  $g.DrawLine($pen, $x + 70 * $scale, $y + 10 * $scale, $x + 130 * $scale, $y + $r)
  $g.DrawLine($pen, $x + $r, $y + $r, $x + 130 * $scale, $y + $r)
  $g.DrawLine($pen, $x + 70 * $scale, $y + 10 * $scale, $x + 78 * $scale, $y - 18 * $scale)
  $pen.Dispose()
}

function Draw-Person($g, [string]$name, [int]$x, [int]$y, [float]$scale, $seed) {
  $skin = if ($name -eq "Amir") { New-Brush (New-Color 176 121 83) } else { New-Brush (New-Color 191 132 93) }
  $hair = if ($name -eq "Amir") { New-Brush (New-Color 37 33 31) } else { New-Brush (New-Color 55 42 38) }
  $shirtColors = @(
    (New-Color 72 104 142), (New-Color 134 80 126), (New-Color 47 121 108),
    (New-Color 182 103 62), (New-Color 82 86 147), (New-Color 57 116 74)
  )
  $shirt = New-Brush $shirtColors[(Jitter $seed 42 0 ($shirtColors.Count - 1))]
  $headR = [int](42 * $scale)
  $bodyW = [int](118 * $scale)
  $bodyH = [int](160 * $scale)
  $g.FillEllipse($skin, $x, $y, $headR * 2, $headR * 2)
  if ($name -eq "Amir") {
    $g.FillPie($hair, $x - 5, $y - 10, $headR * 2 + 10, $headR, 180, 180)
  } else {
    $g.FillEllipse($hair, $x - 18, $y - 10, $headR * 2 + 28, $headR + 22)
  }
  Fill-RoundRect $g $shirt ($x - $bodyW / 2 + $headR) ($y + $headR * 2 - 6) $bodyW $bodyH 32
  $pen = New-Pen (New-Color 36 43 56) 3
  $eyeY = $y + [int](38 * $scale)
  $g.DrawLine($pen, $x + [int](31 * $scale), $eyeY, $x + [int](43 * $scale), $eyeY)
  $g.DrawLine($pen, $x + [int](70 * $scale), $eyeY, $x + [int](82 * $scale), $eyeY)
  $pen.Dispose()
  $skin.Dispose(); $hair.Dispose(); $shirt.Dispose()
}

function Draw-Table($g, [int]$x, [int]$y, [int]$w, [int]$h, $seed) {
  $wood = New-Brush (New-Color 201 155 103)
  Fill-RoundRect $g $wood $x $y $w $h 22
  $wood.Dispose()
  $paper = New-Brush (New-Color 246 244 236)
  $pen = New-Pen (New-Color 75 85 99) 2
  for ($i = 0; $i -lt 5; $i++) {
    $px = $x + 40 + (Jitter $seed (100+$i) 0 ($w - 220))
    $py = $y + 30 + (Jitter $seed (110+$i) 0 ($h - 130))
    $g.FillRectangle($paper, $px, $py, 120, 80)
    $g.DrawRectangle($pen, $px, $py, 120, 80)
  }
  $paper.Dispose(); $pen.Dispose()
}

function Draw-Design-Objects($g, $seed) {
  Draw-Table $g 360 430 650 220 $seed
  $red = New-Brush (New-Color 194 57 47)
  $blue = New-Brush (New-Color 46 87 145)
  $yellow = New-Brush (New-Color 229 184 58)
  $blackPen = New-Pen (New-Color 31 41 55) 6
  for ($i = 0; $i -lt 4; $i++) {
    $x = 440 + $i * 125
    $g.DrawRectangle($blackPen, $x, 500, 70, 70)
    $g.FillRectangle($(if ($i % 3 -eq 0) { $red } elseif ($i % 3 -eq 1) { $blue } else { $yellow }), $x + 6, 506, 58, 58)
  }
  $blackPen.Dispose(); $red.Dispose(); $blue.Dispose(); $yellow.Dispose()
}

function Draw-Roof-Comparison($g, $seed) {
  $base = New-Brush (New-Color 238 235 226)
  $wall1 = New-Brush (New-Color 184 92 64)
  $wall2 = New-Brush (New-Color 197 113 80)
  $roof = New-Pen (New-Color 65 55 50) 8
  $x1 = 470; $y = 470
  $g.FillRectangle($wall1, $x1, $y + 50, 145, 100)
  $wave = New-Object System.Drawing.Drawing2D.GraphicsPath
  $wave.StartFigure()
  $wave.AddBezier($x1 - 8, $y + 58, $x1 + 25, $y + 6, $x1 + 72, $y + 92, $x1 + 154, $y + 34)
  $g.DrawPath($roof, $wave)
  $wave.Dispose()
  $x2 = 705
  $g.FillRectangle($wall2, $x2, $y + 50, 145, 100)
  $g.DrawLine($roof, $x2 - 8, $y + 48, $x2 + 153, $y + 48)
  $win = New-Brush (New-Color 236 244 248)
  $g.FillRectangle($win, $x1 + 35, $y + 82, 35, 35)
  $g.FillRectangle($win, $x2 + 75, $y + 82, 35, 35)
  $base.Dispose(); $wall1.Dispose(); $wall2.Dispose(); $roof.Dispose(); $win.Dispose()
}

function Draw-Office-Objects($g, $seed) {
  Draw-Table $g 350 445 690 190 $seed
  $screen = New-Brush (New-Color 44 62 80)
  $g.FillRectangle($screen, 620, 475, 150, 92)
  $g.FillRectangle((New-Brush (New-Color 228 232 237)), 638, 493, 114, 56)
  $screen.Dispose()
}

function Draw-Kitchen($g, $seed) {
  Draw-Table $g 345 450 720 220 $seed
  $pot = New-Brush (New-Color 95 112 132)
  $food = New-Brush (New-Color 219 150 64)
  $g.FillEllipse($pot, 620, 500, 160, 80)
  $g.FillEllipse($food, 635, 505, 130, 54)
  for ($i = 0; $i -lt 5; $i++) {
    $g.FillEllipse((New-Brush (New-Color 238 235 226)), 410 + $i*110, 575 + (Jitter $seed $i -10 8), 70, 38)
  }
  $pot.Dispose(); $food.Dispose()
}

function Draw-Logistics($g, $seed) {
  Draw-Office-Objects $g $seed
  $box = New-Brush (New-Color 203 147 78)
  for ($i = 0; $i -lt 7; $i++) {
    $g.FillRectangle($box, 870 + (Jitter $seed $i -20 60), 430 + $i*28, 80, 50)
  }
  $box.Dispose()
}

function Draw-Health($g, $seed) {
  Draw-Office-Objects $g $seed
  $cross = New-Brush (New-Color 220 64 64)
  $g.FillRectangle($cross, 860, 470, 28, 110)
  $g.FillRectangle($cross, 820, 510, 110, 28)
  $cross.Dispose()
}

function Draw-Scene($g, $page, $seed) {
  $text = ($page.text + " " + $page.scene + " " + ($page.targets -join " ")).ToLowerInvariant()
  $mode = "street"
  if ($text -match "park|natuur|heide|bos|boom|ecoduct|dieren|fauna|flora|landschap|wandelen") { $mode = "nature" }
  if ($text -match "water|gracht|rivier|sloot|regen|plas|kanaal") { $mode = "water" }
  Draw-Background $g $seed $mode
  if ($mode -eq "nature") { Draw-Park $g $seed }
  elseif ($mode -eq "water") { Draw-Groningen-Street $g $seed; Draw-Canal $g $seed }
  else { Draw-Groningen-Street $g $seed }

  if ($text -match "rietveld|atelier|ontwerp|dak|tekening|vierkant|stoel|architect|maquette|schildering") {
    Draw-Design-Objects $g $seed
    if ($text -match "dak|golvend|plat") { Draw-Roof-Comparison $g $seed }
  }
  elseif ($text -match "koken|eten|soep|gerecht|restaurant|keuken|recept") { Draw-Kitchen $g $seed }
  elseif ($text -match "import|export|zending|pakket|logistiek|wereldeconomie|bedrijf|ondernemer|startkapitaal|sollicitatie|uwv|werk") { Draw-Logistics $g $seed }
  elseif ($text -match "arts|zorg|streetarts|gezond|opvang") { Draw-Health $g $seed }
  elseif ($text -match "formulier|afspraak|cursus|taalles|buurthuis|bibliotheek|groep") { Draw-Office-Objects $g $seed }
  else { Draw-Bicycle $g (Jitter $seed 9 850 1060) (Jitter $seed 10 590 660) 1.1 }

  $scale = 1.15
  $x = Jitter $seed 11 120 260
  if ($page.protagonist -eq "Amir") { $x = Jitter $seed 12 150 330 }
  Draw-Person $g $page.protagonist $x (Jitter $seed 13 360 410) $scale $seed
  if ($text -match "groep|klas|buren|cursisten|bewoners|docent|gids|mentor") {
    $other = if ($page.protagonist -eq "Amir") { "Mila" } else { "Amir" }
    Draw-Person $g $other (Jitter $seed 14 1040 1160) (Jitter $seed 15 380 430) 0.9 ($seed + 99)
  }
}

$pages = Get-Content -LiteralPath $InputJson -Raw | ConvertFrom-Json
$count = 0
foreach ($page in $pages) {
  $outPath = Join-Path (Get-Location) $page.file
  $dir = Split-Path -Parent $outPath
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $seed = Hash-Seed ($page.storyKey + ":" + $page.page + ":" + ($page.targets -join ","))
  $bmp = New-Object System.Drawing.Bitmap $Width, $Height
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  Draw-Scene $g $page $seed
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
  $params = New-Object System.Drawing.Imaging.EncoderParameters 1
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 92L
  $bmp.Save($outPath, $codec, $params)
  $g.Dispose()
  $bmp.Dispose()
  $params.Dispose()
  $count += 1
}

Write-Host "Generated $count storybook images"
