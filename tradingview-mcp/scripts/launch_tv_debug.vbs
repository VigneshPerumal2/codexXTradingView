Set oShell = CreateObject("WScript.Shell")
Set oEnv = oShell.Environment("Process")
port = oEnv("TV_CDP_PORT")
If port = "" Then port = "9222"
oEnv("ELECTRON_EXTRA_LAUNCH_ARGS") = "--remote-debugging-port=" & port
oShell.Run "explorer.exe shell:AppsFolder\TradingView.Desktop_n534cwy3pjxzj!TradingView.Desktop", 1, False
WScript.Sleep 1000
WScript.Echo "Launched"
