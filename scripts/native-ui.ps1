param(
  [int]$X = -1,
  [int]$Y = -1,
  [string]$Screenshot = '',
  [switch]$SimulatorOnly
)

# Native user input and a real screen capture, scoped to the running project
# window. Coordinates are relative to the DevTools window, never the desktop.
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class WarmBrownNativeWindow {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left,Top,Right,Bottom; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr handle,out RECT rect);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x,int y);
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr handle,int x,int y,int width,int height,bool repaint);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags,uint dx,uint dy,uint data,UIntPtr extra);
}
'@
$nativeProjectRoot = Split-Path -Parent $PSScriptRoot
$nativeProjectConfig = Get-Content -LiteralPath (Join-Path $nativeProjectRoot 'project.config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$nativeProjectTitle = [string]$nativeProjectConfig.projectname
$nativeWindow = Get-Process -Name wechatdevtools | Where-Object { $_.MainWindowTitle.StartsWith($nativeProjectTitle, [StringComparison]::OrdinalIgnoreCase) -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $nativeWindow) { throw "The $nativeProjectTitle DevTools project window is not open." }
$nativeRect = New-Object WarmBrownNativeWindow+RECT
[void][WarmBrownNativeWindow]::GetWindowRect($nativeWindow.MainWindowHandle,[ref]$nativeRect)
if ($X -ge 0 -and $Y -ge 0) {
  [void][WarmBrownNativeWindow]::SetCursorPos(($nativeRect.Left+$X),($nativeRect.Top+$Y))
  Start-Sleep -Milliseconds 150
  [WarmBrownNativeWindow]::mouse_event(2,0,0,0,[UIntPtr]::Zero)
  Start-Sleep -Milliseconds 100
  [WarmBrownNativeWindow]::mouse_event(4,0,0,0,[UIntPtr]::Zero)
  Start-Sleep -Milliseconds 650
}
if ($Screenshot) {
  if ($SimulatorOnly) {
    # This checked-in harness targets the 390px iPhone simulator at 96% zoom.
    $nativeCaptureX = $nativeRect.Left+62
    $nativeCaptureY = $nativeRect.Top+152
    $nativeWidth = 375
    $nativeHeight = 810
  } else {
    $nativeCaptureX = $nativeRect.Left
    $nativeCaptureY = $nativeRect.Top
    $nativeWidth = $nativeRect.Right-$nativeRect.Left
    $nativeHeight = $nativeRect.Bottom-$nativeRect.Top
  }
  $nativeBitmap = New-Object Drawing.Bitmap $nativeWidth,$nativeHeight
  $nativeGraphics = [Drawing.Graphics]::FromImage($nativeBitmap)
  try {
    $nativeGraphics.CopyFromScreen($nativeCaptureX,$nativeCaptureY,0,0,$nativeBitmap.Size)
    $nativeBitmap.Save([IO.Path]::GetFullPath($Screenshot))
  } finally { $nativeGraphics.Dispose(); $nativeBitmap.Dispose() }
}
