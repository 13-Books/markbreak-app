# MarkBreak Docx/PDF export via Pandoc + markbreak.lua (from pinned profile).
param(
	[Parameter(Mandatory = $true)][string]$InputFile,
	[ValidateSet("docx", "pdf")][string]$Format = "docx",
	[string]$OutFile = ""
)
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$appRoot = Resolve-Path (Join-Path $here "..")

function Resolve-MarkBreakFilter {
	$candidates = @(
		(Join-Path $here "markbreak\tools\markbreak.lua"),
		(Join-Path $appRoot.Path "..\markbreak\tools\markbreak.lua")
	)
	foreach ($path in $candidates) {
		if (Test-Path $path) {
			return (Resolve-Path $path).Path
		}
	}
	throw @"
markbreak.lua not found.
Init the dialect submodule:
  git submodule update --init --recursive
Or keep a sibling checkout at ../markbreak (profile VERSION must match MARKBREAK.md).
"@
}

function Get-MarkBreakVersion([string]$FilterPath) {
	$versionFile = Join-Path (Split-Path (Split-Path $FilterPath -Parent) -Parent) "VERSION"
	if (Test-Path $versionFile) {
		return (Get-Content -Raw $versionFile).Trim()
	}
	return "unknown"
}

$filter = Resolve-MarkBreakFilter
$profileVersion = Get-MarkBreakVersion $filter

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
# Default aliases only — do not rewrite //break odd|even|column (filter owns those).
$normalized = [regex]::Replace($raw, '(?m)^[ \t]*//---[ \t]*$', '\newpage')
$normalized = [regex]::Replace($normalized, '(?m)^[ \t]*//—[ \t]*$', '\newpage')
$normalized = [regex]::Replace($normalized, '(?m)^[ \t]*//break[ \t]*$', '\newpage')
$tmp = [System.IO.Path]::GetTempFileName() + ".md"
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($tmp, $normalized, $utf8)
if (-not $OutFile) { $OutFile = [System.IO.Path]::ChangeExtension($InputFile, ".$Format") }
$pandoc = Find-Pandoc
Write-Host "MarkBreak profile $profileVersion"
Write-Host "filter: $filter"
& $pandoc $tmp -f markdown -t $Format -L $filter -o $OutFile
if ($LASTEXITCODE -ne 0) { throw "pandoc failed" }
Remove-Item $tmp -Force
Write-Host "Wrote $OutFile"
