Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class NativeToolWindowCapture {
 [StructLayout(LayoutKind.Sequential)] public struct RECT {public int Left; public int Top; public int Right; public int Bottom;}
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd,out RECT rect);
 [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hwnd,IntPtr hdc,int flags);
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hwnd);
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd,int command);
}
"@
$proc = Get-Process -Name 'wechatdevtools' | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $proc) { throw 'Native DevTools project window is not open.' }
$rect = New-Object NativeToolWindowCapture+RECT
[NativeToolWindowCapture]::GetWindowRect($proc.MainWindowHandle,[ref]$rect) | Out-Null
$bitmap = New-Object System.Drawing.Bitmap(($rect.Right-$rect.Left),($rect.Bottom-$rect.Top))
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$hdc = $graphics.GetHdc()
$ok = [NativeToolWindowCapture]::PrintWindow($proc.MainWindowHandle,$hdc,2)
$graphics.ReleaseHdc($hdc)
$target = Join-Path (Split-Path $PSScriptRoot) 'artifacts\screenshots\devtools-window.png'
$bitmap.Save($target,[System.Drawing.Imaging.ImageFormat]::Png)
$null = [NativeToolWindowCapture]::ShowWindow($proc.MainWindowHandle,9)
$null = [NativeToolWindowCapture]::SetForegroundWindow($proc.MainWindowHandle)
Start-Sleep -Milliseconds 600
$null = [NativeToolWindowCapture]::GetWindowRect($proc.MainWindowHandle,[ref]$rect)
$graphics.CopyFromScreen($rect.Left,$rect.Top,0,0,$bitmap.Size)
$visibleTarget = Join-Path (Split-Path $PSScriptRoot) 'artifacts\screenshots\devtools-window-visible.png'
$bitmap.Save($visibleTarget,[System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
Write-Output "Native DevTools window captured: $ok / $($proc.MainWindowTitle) / $target"
