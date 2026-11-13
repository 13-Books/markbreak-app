# Emit a minimal RigWorks 1.5+ .rig JSON from a MarkBreak .md (provenance + flow.role).
param(
	[Parameter(Mandatory = $true)][string]$InputFile,
	[string]$OutFile = ""
)
$ErrorActionPreference = "Stop"
$raw = [System.IO.File]::ReadAllText((Resolve-Path $InputFile))
# Keep ^/$ matches reliable on Windows CRLF manuscripts.
$raw = [regex]::Replace($raw, '\r\n?', "`n")
$role = "chapter"
if ($raw -match '(?m)^role:\s*["'']?([a-z]+)["'']?\s*$') { $role = $Matches[1] }
$name = [System.IO.Path]::GetFileName($InputFile)
$ext = [System.IO.Path]::GetExtension($InputFile).TrimStart(".").ToLowerInvariant()
$lang = "markdown"
if ($ext -eq "csv") { $lang = "csv" }
elseif ($ext -eq "tsv") { $lang = "tsv" }
$textJson = ConvertTo-Json -InputObject ([string]$raw)
if (-not $OutFile) { $OutFile = [System.IO.Path]::ChangeExtension($InputFile, ".rig.json") }
$doc = @"
{
  "rig": "1.5.0",
  "document": { "title": $($name | ConvertTo-Json) },
  "entities": [
    {
      "id": "source",
      "components": {
        "rig.meta.named": { "name": $($name | ConvertTo-Json), "stableId": "source" },
        "rig.media.code": { "text": $textJson, "language": $($lang | ConvertTo-Json) },
        "rig.media.asset_ref": { "kind": "document", "path": $($name | ConvertTo-Json) }
      }
    },
    {
      "id": "p-stub",
      "components": {
        "rig.story.paragraph": {
          "runs": [{ "text": "(Compose body via layout host — provenance is source.)" }]
        }
      }
    },
    {
      "id": "story",
      "components": {
        "rig.meta.named": { "name": $($name | ConvertTo-Json), "stableId": "story" },
        "rig.story.flow": { "role": $($role | ConvertTo-Json), "blocks": ["p-stub"] }
      }
    }
  ]
}
"@
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($OutFile, $doc, $utf8)
Write-Host "Wrote $OutFile (role=$role)"
