Set shell = CreateObject("WScript.Shell")
projectRoot = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
batchPath = projectRoot & "\start-backend.bat"
shell.Run Chr(34) & batchPath & Chr(34), 0, False
