param(
  [string]$BaseUrl = "https://nanquimori.github.io/KapiTomo",
  [string]$LibraryId = "kapitomo",
  [string]$LibraryName = "KapiTomo"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$WorksRoot = Join-Path $Root "obras"
$GeneratedAssetsRoot = Join-Path $Root "assets\works"
$ApiRoot = Join-Path $Root "api"
$ApiWorksRoot = Join-Path $ApiRoot "works"
$MangaRoot = Join-Path $Root "manga"
$BaseUrl = $BaseUrl.TrimEnd("/")

function Ensure-Dir([string]$Path) {
  New-Item -ItemType Directory -Force -Path $Path | Out-Null
}

function Write-Log([string]$Message) {
}

function Write-Utf8([string]$Path, [string]$Content) {
  Ensure-Dir (Split-Path -Parent $Path)
  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

function Escape-JsonString([string]$Value) {
  if ($null -eq $Value) { return "" }
  $builder = New-Object System.Text.StringBuilder
  foreach ($char in $Value.ToCharArray()) {
    switch ($char) {
      '"' { [void]$builder.Append('\"') }
      '\' { [void]$builder.Append('\\') }
      "`b" { [void]$builder.Append('\b') }
      "`f" { [void]$builder.Append('\f') }
      "`n" { [void]$builder.Append('\n') }
      "`r" { [void]$builder.Append('\r') }
      "`t" { [void]$builder.Append('\t') }
      default {
        $code = [int][char]$char
        if ($code -lt 32) {
          [void]$builder.Append(('\u{0:x4}' -f $code))
        } else {
          [void]$builder.Append($char)
        }
      }
    }
  }
  return $builder.ToString()
}

function ConvertTo-JsonLiteral($Value, [int]$Depth = 0) {
  if ($null -eq $Value) { return "null" }
  if ($Value -is [string]) { return '"' + (Escape-JsonString $Value) + '"' }
  if ($Value -is [bool]) { return $(if ($Value) { "true" } else { "false" }) }
  if ($Value -is [byte] -or $Value -is [int16] -or $Value -is [int32] -or $Value -is [int64] -or $Value -is [single] -or $Value -is [double] -or $Value -is [decimal]) {
    return ([string]::Format([Globalization.CultureInfo]::InvariantCulture, "{0}", $Value))
  }
  if ($Value -is [System.Collections.IDictionary]) {
    $parts = @()
    foreach ($key in $Value.Keys) {
      $parts += ('"' + (Escape-JsonString ([string]$key)) + '": ' + (ConvertTo-JsonLiteral $Value[$key] ($Depth + 1)))
    }
    return "{`r`n" + ("  " * ($Depth + 1)) + ($parts -join ",`r`n$(""  "" * ($Depth + 1))") + "`r`n" + ("  " * $Depth) + "}"
  }
  if (($Value -is [System.Collections.IEnumerable]) -and -not ($Value -is [string])) {
    $parts = @()
    foreach ($item in $Value) {
      $parts += ConvertTo-JsonLiteral $item ($Depth + 1)
    }
    if (-not $parts.Count) { return "[]" }
    return "[`r`n" + ("  " * ($Depth + 1)) + ($parts -join ",`r`n$(""  "" * ($Depth + 1))") + "`r`n" + ("  " * $Depth) + "]"
  }
  if ($Value.PSObject -and $Value.PSObject.Properties.Count) {
    $ordered = [ordered]@{}
    foreach ($property in $Value.PSObject.Properties) {
      $ordered[$property.Name] = $property.Value
    }
    return ConvertTo-JsonLiteral $ordered $Depth
  }
  return '"' + (Escape-JsonString ([string]$Value)) + '"'
}

function To-JsonText($Value) {
  return ConvertTo-JsonLiteral $Value 0
}

function Get-RelativeUrl([string]$Path) {
  $rootPath = [System.IO.Path]::GetFullPath($Root).TrimEnd("\") + "\"
  $targetPath = [System.IO.Path]::GetFullPath($Path)
  $rootUri = New-Object System.Uri($rootPath)
  $targetUri = New-Object System.Uri($targetPath)
  $relative = [System.Uri]::UnescapeDataString($rootUri.MakeRelativeUri($targetUri).ToString())
  return ($relative -replace "\\", "/")
}

function Get-PublicUrl([string]$Path) {
  return "$BaseUrl/$(Get-RelativeUrl $Path)"
}

function Get-UnixMs([System.IO.FileSystemInfo]$Item) {
  return [int64](([DateTimeOffset]$Item.LastWriteTimeUtc).ToUnixTimeMilliseconds())
}

function ConvertTo-Slug([string]$Value) {
  $text = [string]$Value
  $normalized = $text.Normalize([Text.NormalizationForm]::FormD)
  $builder = New-Object System.Text.StringBuilder
  foreach ($char in $normalized.ToCharArray()) {
    if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($char) -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
      [void]$builder.Append($char)
    }
  }
  $slug = $builder.ToString().ToLowerInvariant() -replace "[^a-z0-9]+", "-"
  $slug = $slug.Trim("-")
  if (-not $slug) { return "obra" }
  return $slug
}

function ConvertTo-Title([string]$Slug) {
  $parts = ($Slug -replace "[-_]+", " ").Split(" ", [StringSplitOptions]::RemoveEmptyEntries)
  if (-not $parts.Length) { return "Obra sem titulo" }
  return (($parts | ForEach-Object {
    if ($_.Length -le 1) { $_.ToUpperInvariant() } else { $_.Substring(0, 1).ToUpperInvariant() + $_.Substring(1) }
  }) -join " ")
}

function Escape-Html([string]$Value) {
  return [System.Net.WebUtility]::HtmlEncode([string]$Value)
}

function Get-Paragraphs([string]$Text) {
  return @(
    ($Text -split "(\r?\n){2,}" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  )
}

function Get-WordCount([string[]]$Paragraphs) {
  $joined = ($Paragraphs -join " ").Trim()
  if (-not $joined) { return 0 }
  return @($joined -split "\s+" | Where-Object { $_ }).Count
}

function Read-Metadata([System.IO.DirectoryInfo]$WorkDir) {
  $path = Join-Path $WorkDir.FullName "obra.json"
  if (Test-Path $path) {
    return Get-Content $path -Raw | ConvertFrom-Json
  }
  return [pscustomobject]@{}
}

function Find-Cover([System.IO.DirectoryInfo]$WorkDir) {
  $names = @("capa.png", "cover.png", "capa.jpg", "cover.jpg", "capa.jpeg", "cover.jpeg", "capa.webp", "cover.webp")
  foreach ($name in $names) {
    $path = Join-Path $WorkDir.FullName $name
    if (Test-Path $path) { return Get-Item $path }
  }
  return Get-ChildItem -Path $WorkDir.FullName -File -Recurse |
    Where-Object { $_.Extension -match "^\.(png|jpe?g|webp)$" } |
    Sort-Object FullName |
    Select-Object -First 1
}

function Get-ChapterName([string]$Title, [int]$Index) {
  if ($Title -match "^\s*Cap[ií]tulo\s+\d+\s*[-:]\s*(.+)$") {
    return $Matches[1].Trim()
  }
  if ($Title -match "^\s*Chapter\s+\d+\s*[-:]\s*(.+)$") {
    return $Matches[1].Trim()
  }
  return "Capitulo $($Index.ToString("00"))"
}

function New-ChapterPage([string]$Title, [string]$BodyHtml, [string]$Background) {
  return @"
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>$(Escape-Html $Title) | KapiTomo</title>
    <style>body{margin:0;background:$Background;color:#15151a;font-family:Arial,Helvetica,sans-serif}.reading-content{width:min(900px,100%);margin:0 auto;padding:0}.novel-content{width:min(780px,calc(100% - 36px));margin:0 auto;padding:32px 0 56px}.novel-content p{font-size:1.08rem;line-height:1.8;margin:0 0 20px}.wp-manga-chapter-img{display:block;width:100%;height:auto}</style>
  </head>
  <body>
    <main class="reading-content">
$BodyHtml
    </main>
  </body>
</html>
"@
}

Ensure-Dir $GeneratedAssetsRoot
Ensure-Dir $ApiWorksRoot
Ensure-Dir $MangaRoot

$worksForSite = @()
$worksForApi = @()
$legacyWorks = @()

$workDirs = Get-ChildItem -Path $WorksRoot -Directory | Where-Object { $_.Name -notmatch "^_" } | Sort-Object Name
foreach ($workDir in $workDirs) {
  $slug = ConvertTo-Slug $workDir.Name
  Write-Log "obra $slug"
  Write-Host "Gerando obra: $slug"
  $metadata = Read-Metadata $workDir
  $title = if ($metadata.title) { [string]$metadata.title } else { ConvertTo-Title $workDir.Name }
  $author = if ($metadata.author) { [string]$metadata.author } else { $LibraryName }
  $format = if ($metadata.format) { [string]$metadata.format } else { "Novel" }
  $genre = if ($metadata.genre) { [string]$metadata.genre } else { "Geral" }
  $status = if ($metadata.status) { [string]$metadata.status } else { "Em andamento" }
  $rating = if ($metadata.rating) { [string]$metadata.rating } else { "Livre" }
  $summary = if ($metadata.summary) { [string]$metadata.summary } else { "" }
  $description = if ($metadata.description) { [string]$metadata.description } else { $summary }
  $notice = if ($metadata.notice) { [string]$metadata.notice } else { "" }
  $isTest = [bool]$metadata.isTest

  $assetWorkDir = Join-Path $GeneratedAssetsRoot $slug
  Ensure-Dir $assetWorkDir

  $cover = Find-Cover $workDir
  $coverUrl = ""
  $coverName = ""
  $coverLastModified = 0
  if ($cover) {
    $coverName = "cover$($cover.Extension.ToLowerInvariant())"
    $coverDest = Join-Path $assetWorkDir $coverName
    Copy-Item -LiteralPath $cover.FullName -Destination $coverDest -Force
    $coverUrl = Get-PublicUrl $coverDest
    $coverLastModified = Get-UnixMs $cover
  }

  $chaptersRoot = Join-Path $workDir.FullName "capitulos"
  $chapterItems = @()
  if (Test-Path $chaptersRoot) {
    $chapterItems = @(Get-ChildItem -Path $chaptersRoot | Where-Object {
      ($_.PSIsContainer) -or ($_.Extension -match "^\.(json|md)$")
    } | Sort-Object Name)
  }

  $siteChapters = @()
  $apiChapters = @()
  $legacyChapters = @()
  $chapterNumber = 0
  foreach ($chapterItem in $chapterItems) {
    $chapterNumber += 1
    $chapterId = ConvertTo-Slug $chapterItem.BaseName
    if ($chapterItem.PSIsContainer) { $chapterId = ConvertTo-Slug $chapterItem.Name }
    if (-not $chapterId) { $chapterId = "capitulo-$($chapterNumber.ToString("000"))" }
    Write-Log "capitulo $slug/$chapterId"
    Write-Host "  Capitulo: $chapterId"

    $chapterTitle = ConvertTo-Title $chapterId
    $chapterName = Get-ChapterName $chapterTitle $chapterNumber
    $chapterUrl = "$BaseUrl/manga/$slug/$($chapterNumber - 1)/"
    $chapterApiPath = Join-Path $ApiWorksRoot "$slug\chapters\$chapterId.json"
    $legacyChapterPath = Join-Path $ApiRoot "$slug\$chapterId.json"
    $contentType = "novel"
    $paragraphs = @()
    $text = ""
    $pages = @()
    $sitePages = @()
    $wordCount = 0
    $paragraphCount = 0

    if ($chapterItem.PSIsContainer) {
      Write-Log "  imagens inicio"
      $contentType = "images"
      $format = if ($metadata.format) { $format } else { "Quadrinho" }
      $imageFiles = @(Get-ChildItem -Path $chapterItem.FullName -File | Where-Object { $_.Extension -match "^\.(png|jpe?g|webp|gif)$" } | Sort-Object Name)
      $chapterAssetDir = Join-Path $assetWorkDir $chapterId
      Ensure-Dir $chapterAssetDir
      $pageNumber = 0
      foreach ($image in $imageFiles) {
        $pageNumber += 1
        $pageName = "page-$($pageNumber.ToString("000"))$($image.Extension.ToLowerInvariant())"
        $pageDest = Join-Path $chapterAssetDir $pageName
        Copy-Item -LiteralPath $image.FullName -Destination $pageDest -Force
        $pageUrl = Get-PublicUrl $pageDest
        $pages += [ordered]@{
          number = $pageNumber
          name = $pageName
          image = $pageUrl
          url = $pageUrl
          lastModified = Get-UnixMs $image
        }
        $sitePages += $pageUrl
      }
      Write-Log "  imagens fim"
    } else {
      Write-Log "  novel le texto"
      $contentType = "novel"
      if ($chapterItem.Extension -ieq ".json") {
        $chapterJson = Get-Content $chapterItem.FullName -Raw | ConvertFrom-Json
        if ($chapterJson.title) {
          $chapterTitle = [string]$chapterJson.title
          $chapterName = Get-ChapterName $chapterTitle $chapterNumber
        }
        if ($chapterJson.name) {
          $chapterName = [string]$chapterJson.name
        }
        if ($chapterJson.paragraphs -is [System.Array]) {
          $paragraphs = @($chapterJson.paragraphs | ForEach-Object { [string]$_ } | Where-Object { $_.Trim() })
        } elseif ($chapterJson.text) {
          $paragraphs = @(Get-Paragraphs ([string]$chapterJson.text))
        } elseif ($chapterJson.content -is [System.Array]) {
          $paragraphs = @($chapterJson.content | ForEach-Object { [string]$_ } | Where-Object { $_.Trim() })
        }
        if ($chapterJson.wordCount) {
          $wordCount = [int]$chapterJson.wordCount
        }
      } else {
        $text = Get-Content $chapterItem.FullName -Raw
        $paragraphs = @(Get-Paragraphs $text)
        if ($paragraphs.Count -gt 0) {
          $chapterTitle = $paragraphs[0]
          $chapterName = Get-ChapterName $chapterTitle $chapterNumber
        }
      }
      Write-Log "  novel paragrafos"
      if (-not $paragraphs.Count) {
        throw "Capitulo novel sem paragraphs/text/content: $($chapterItem.FullName)"
      }
      $text = ($paragraphs -join "`r`n`r`n")
      if (-not $wordCount) { $wordCount = Get-WordCount $paragraphs }
      $paragraphCount = $paragraphs.Count
      Write-Log "  novel fim"
    }

    if (-not $summary -and $paragraphs.Count -gt 0) { $summary = $paragraphs[0] }
    if (-not $description) { $description = $summary }

    Write-Log "  monta detalhe"
    $chapterDetail = [ordered]@{
      schema_version = 1
      type = "nyxovira_chapter"
      source = [ordered]@{ id = $LibraryId; name = $LibraryName; url = $BaseUrl }
      chapter = [ordered]@{
        id = $chapterId
        number = [string]$chapterNumber
        title = $chapterTitle
        name = $chapterName
        contentType = $contentType
        url = $chapterUrl
        text = $text
        paragraphs = $paragraphs
        pages = $pages
        pageCount = $pages.Count
        wordCount = $wordCount
        paragraphCount = $paragraphCount
      }
    }
    Write-Log "  escreve chapter api"
    Write-Utf8 $chapterApiPath (To-JsonText $chapterDetail)
    Write-Log "  escreveu chapter api"

    $legacyPages = @($pages | ForEach-Object {
      [ordered]@{ name = $_.name; sourceUrl = $_.url; lastModified = $_.lastModified }
    })
    $legacyChapter = [ordered]@{
      mode = "android-chapter"
      libraryId = $LibraryId
      workFolderName = $slug
      chapterFolderName = $chapterId
      contentType = $contentType
      pages = $legacyPages
      pageCount = $pages.Count
      totalImagesExpected = $pages.Count
      sourceUrl = $chapterUrl
    }
    if ($contentType -eq "novel") {
      $legacyChapter.text = $text
      $legacyChapter.paragraphs = $paragraphs
      $legacyChapter.wordCount = $wordCount
      $legacyChapter.paragraphCount = $paragraphCount
    }
    Write-Log "  escreve legacy"
    Write-Utf8 $legacyChapterPath (To-JsonText $legacyChapter)
    Write-Log "  escreveu legacy"

    $bodyHtml = ""
    if ($contentType -eq "images") {
      $bodyHtml = ($sitePages | ForEach-Object {
        "      <img class=""wp-manga-chapter-img"" src=""$(Escape-Html $_)"" alt=""$(Escape-Html $chapterTitle)"">"
      }) -join "`r`n"
      $chapterHtml = New-ChapterPage $chapterTitle $bodyHtml "#000"
    } else {
      $bodyHtml = "      <article class=""novel-content"" data-content-type=""novel"">`r`n" + (($paragraphs | ForEach-Object {
        "        <p>$(Escape-Html $_)</p>"
      }) -join "`r`n") + "`r`n      </article>"
      $chapterHtml = New-ChapterPage $chapterTitle $bodyHtml "#fff"
    }
    Write-Log "  escreve html"
    Write-Utf8 (Join-Path $MangaRoot "$slug\$($chapterNumber - 1)\index.html") $chapterHtml
    Write-Utf8 (Join-Path $MangaRoot "$slug\$slug-chapter-$($chapterNumber - 1)\index.html") $chapterHtml
    Write-Log "  escreveu html"

    $siteChapter = [ordered]@{
      title = $chapterTitle
      date = (Get-Date $chapterItem.LastWriteTime -Format "yyyy-MM-dd")
      contentType = $contentType
    }
    if ($contentType -eq "novel") {
      $siteChapter.paragraphs = $paragraphs
      $siteChapter.pages = $paragraphs
    } else {
      $siteChapter.pages = $sitePages
      $siteChapter.images = @($pages | ForEach-Object {
        [ordered]@{ src = $_.url; alt = "$title $chapterTitle pagina $($_.number)" }
      })
    }
    $siteChapters += $siteChapter

    $apiChapterSummary = [ordered]@{
      id = $chapterId
      number = [string]$chapterNumber
      title = $chapterTitle
      name = $chapterName
      contentType = $contentType
      url = $chapterUrl
      apiUrl = Get-PublicUrl $chapterApiPath
      pageCount = $pages.Count
      wordCount = $wordCount
      paragraphCount = $paragraphCount
    }
    $apiChapters += $apiChapterSummary

    $legacyChapterSummary = [ordered]@{
      folderName = $chapterId
      title = $chapterTitle
      chapterName = $chapterName
      contentType = $contentType
      pageCount = $pages.Count
      totalImagesExpected = $pages.Count
      manifestSourceUrl = Get-PublicUrl $legacyChapterPath
      updatedAt = Get-UnixMs $chapterItem
      sourceUrl = $chapterUrl
      apiUrl = Get-PublicUrl $chapterApiPath
    }
    if ($contentType -eq "novel") {
      $legacyChapterSummary.text = $text
      $legacyChapterSummary.paragraphs = $paragraphs
      $legacyChapterSummary.wordCount = $wordCount
      $legacyChapterSummary.paragraphCount = $paragraphCount
    }
    $legacyChapters += $legacyChapterSummary
  }

  $workUrl = "$BaseUrl/manga/$slug/"
  $workApiPath = Join-Path $ApiWorksRoot "$slug\index.json"
  $workIndexHtml = @"
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>$(Escape-Html $title) | KapiTomo</title>
  </head>
  <body>
    <h1>$(Escape-Html $title)</h1>
    <ul>
$((1..$siteChapters.Count | ForEach-Object { "      <li><a href=""$($_ - 1)/"">$(Escape-Html $siteChapters[$_ - 1].title)</a></li>" }) -join "`r`n")
    </ul>
  </body>
</html>
"@
  Write-Utf8 (Join-Path $MangaRoot "$slug\index.html") $workIndexHtml

  $workApi = [ordered]@{
    schema_version = 1
    type = "nyxovira_work"
    source = [ordered]@{ id = $LibraryId; name = $LibraryName; url = $BaseUrl }
    work = [ordered]@{
      id = $slug
      slug = $slug
      title = $title
      author = $author
      format = $format
      status = $status
      summary = $summary
      description = $description
      cover = $coverUrl
      url = $workUrl
      apiUrl = Get-PublicUrl $workApiPath
      chapters = $apiChapters
    }
  }
  Write-Utf8 $workApiPath (To-JsonText $workApi)

  $worksForSite += [ordered]@{
    id = $slug
    title = $title
    status = $status
    genre = $genre
    format = $format
    rating = $rating
    testNote = $notice
    cover = $coverUrl
    description = $description
    chapters = $siteChapters
  }

  $worksForApi += [ordered]@{
    id = $slug
    slug = $slug
    title = $title
    author = $author
    format = $format
    status = $status
    summary = $summary
    description = $description
    cover = $coverUrl
    url = $workUrl
    apiUrl = Get-PublicUrl $workApiPath
    chapters = $apiChapters
  }

  $legacyWorks += [ordered]@{
    libraryId = $LibraryId
    libraryName = $LibraryName
    folderName = $slug
    title = $title
    author = $author
    type = $format
    isTest = $isTest
    notice = $notice
    summary = $summary
    sourceUrl = $workUrl
    coverName = $coverName
    coverSourceUrl = $coverUrl
    coverLastModified = $coverLastModified
    updatedAt = $coverLastModified
    chapters = $legacyChapters
    apiUrl = Get-PublicUrl $workApiPath
  }
}

$worksIndex = [ordered]@{
  schema_version = 1
  type = "nyxovira_work_index"
  source = [ordered]@{ id = $LibraryId; name = $LibraryName; url = $BaseUrl; homeUrl = "$BaseUrl/" }
  works = $worksForApi
}
Write-Utf8 (Join-Path $ApiWorksRoot "index.json") (To-JsonText $worksIndex)

$legacyCatalog = [ordered]@{
  mode = "android-catalog"
  folderName = $LibraryName
  folderPath = "$BaseUrl/api/catalog.json"
  libraries = @([ordered]@{ id = $LibraryId; name = $LibraryName; path = "$BaseUrl/" })
  works = $legacyWorks
  worksApiUrl = "$BaseUrl/api/works/index.json"
}
Write-Utf8 (Join-Path $ApiRoot "catalog.json") (To-JsonText $legacyCatalog)

$siteWorksJson = To-JsonText $worksForSite
Write-Utf8 (Join-Path $Root "data\works.js") "window.KAPI_TOMO_WORKS = $siteWorksJson;`r`n"

Write-Host "KapiTomo gerado com $($worksForSite.Count) obra(s)."
Write-Host "Entrada: $WorksRoot"
Write-Host "Saida: data/works.js, api/, assets/works/ e manga/"
