$docsDir = "c:\Users\nilli\Documents\WebApp\AWH_Documentation\docs"
$outJs = "c:\Users\nilli\Documents\WebApp\AWH_Documentation\js\data.js"
$files = Get-ChildItem -Path $docsDir -Recurse -Filter *.htm
$dict = New-Object 'System.Collections.Generic.Dictionary[String,String]'

foreach ($f in $files) {
    $relPath = $f.FullName.Substring($docsDir.Length + 1).Replace("\", "/")
    $content = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    $dict[$relPath] = $content
}

$json = $dict | ConvertTo-Json -Depth 5 -Compress
Set-Content -Path $outJs -Value "window.DOC_DATA = $json;" -Encoding UTF8
Write-Output "Successfully bundled $($files.Count) files into js/data.js"
