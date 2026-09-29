# Deterministic slicing of the approved mockup, requested by the user.
Add-Type -AssemblyName System.Drawing
$source='C:\Users\beta\.codex\generated_images\01a0e897-6dc9-7670-8154-2a7fb114dc68\exec-38dcc8c6-221a-4ac3-a8ed-23e5eb17982f.png'
$src=[Drawing.Bitmap]::FromFile($source)
$out=Join-Path $PSScriptRoot '../app/src/renderer/console/panes/relationship-art'
$slices=@{
 'forest'=@(0,0,260,452); 'footer-pattern'=@(0,1725,290,119);
 'binding'=@(44,462,113,76); 'journal-title'=@(190,498,473,76);
 'hearts'=@(58,625,76,53); 'handshake'=@(63,712,67,52);
 'speech'=@(462,710,67,62); 'heart'=@(81,907,82,72);
 'pencil'=@(428,624,56,60); 'tea'=@(78,1370,80,74);
 'wave'=@(77,1458,82,78); 'paw'=@(265,809,38,40)
}
foreach($name in $slices.Keys){
 $r=$slices[$name];$bmp=$src.Clone([Drawing.Rectangle]::new($r[0],$r[1],$r[2],$r[3]),[Drawing.Imaging.PixelFormat]::Format32bppArgb)
 # Flood only edge-connected paper pixels, preserving cream ink inside outlined icons.
 if($name -in @('hearts','handshake','speech','heart','pencil','tea','wave','paw')){
  $seen=New-Object 'bool[]' ($bmp.Width*$bmp.Height)
  $q=New-Object 'System.Collections.Generic.Queue[int]'
  for($x=0;$x -lt $bmp.Width;$x++){$q.Enqueue($x);$q.Enqueue(($bmp.Height-1)*$bmp.Width+$x)}
  for($y=0;$y -lt $bmp.Height;$y++){$q.Enqueue($y*$bmp.Width);$q.Enqueue($y*$bmp.Width+$bmp.Width-1)}
  while($q.Count){$i=$q.Dequeue();if($seen[$i]){continue};$seen[$i]=$true;$x=$i%$bmp.Width;$y=[int][Math]::Floor($i/$bmp.Width);$c=$bmp.GetPixel($x,$y)
   if($c.R -gt 215 -and $c.G -gt 190 -and $c.B -gt 158 -and ($c.R-$c.B) -lt 85){
    $bmp.SetPixel($x,$y,[Drawing.Color]::FromArgb(0,$c.R,$c.G,$c.B))
    if($x -gt 0){$q.Enqueue($i-1)};if($x -lt $bmp.Width-1){$q.Enqueue($i+1)};if($y -gt 0){$q.Enqueue($i-$bmp.Width)};if($y -lt $bmp.Height-1){$q.Enqueue($i+$bmp.Width)}
   }
  }
 }
 $bmp.Save((Join-Path $out ($name+'.png')),[Drawing.Imaging.ImageFormat]::Png);$bmp.Dispose()
}
$src.Dispose()
$slices | ConvertTo-Json | Set-Content (Join-Path $out 'slices.json')
