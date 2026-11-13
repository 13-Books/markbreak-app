# MarkBreak Docx/PDF export via Pandoc + markbreak.lua
param(
	[Parameter(Mandatory = $true)][string]$InputFile,
	[ValidateSet("docx", "pdf")][string]$Format = "docx",
	[string]$OutFile = ""
)
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$appRoot = Resolve-Path (Join-Path $here "..")
$sibling = Join-Path $appRoot.Path "..\markbreak\tools\markbreak.lua"
$filter = Join-Path $here "markbreak.lua"
if (Test-Path $sibling) { $filter = (Resolve-Path $sibling).Path }
elseif (-not (Test-Path $filter)) { throw "markbreak.lua not found" }

function Find-Pandoc {
	$c1 = Join-Path $env:LOCALAPPDATA "Pandoc\pandoc.exe"
	if (Test-Path $c1) { return (Resolve-Path $c1).Path }
	$cmd = Get-Command pandoc -ErrorAction SilentlyContinue
	if ($cmd) { return $cmd.Source }
	throw "pandoc not found"
}

$raw = Get-Content -Raw -Path $InputFile
# Pandoc/filter line anchors expect LF; Windows CRLF leaves a CR that breaks ^/$ matches.
$raw = [regex]::Replace($raw, '\r\n?', "`n")
$normalized = [regex]::Replace($raw, '(?m)^[ \t]*//---[ \t]*$', '\newpage')
$normalized = [regex]::Replace($normalized, '(?m)^[ \t]*//—[ \t]*$', '\newpage')
$normalized = [regex]::Replace($normalized, '(?m)^[ \t]*//break[ \t]*$', '\newpage')
$tmp = [System.IO.Path]::GetTempFileName() + ".md"
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($tmp, $normalized, $utf8)
if (-not $OutFile) { $OutFile = [System.IO.Path]::ChangeExtension($InputFile, ".$Format") }
$pandoc = Find-Pandoc
& $pandoc $tmp -f markdown -t $Format -L $filter -o $OutFile
if ($LASTEXITCODE -ne 0) { throw "pandoc failed" }
Remove-Item $tmp -Force
Write-Host "Wrote $OutFile"
