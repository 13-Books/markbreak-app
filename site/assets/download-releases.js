// Resolve GitHub release asset URLs for the download picker.
// Filenames carry the version; the releases page stays as fallback.
;(() => {
  const releasesPage = 'https://github.com/13-Books/markbreak-app/releases/latest'
  const assetPatterns = {
    'win-x64-setup': /^markbreak-win-x64-.+-setup\.exe$/,
    'win-arm64-setup': /^markbreak-win-arm64-.+-setup\.exe$/,
    'win-x64-zip': /^markbreak-win-x64-.+\.zip$/,
    'win-arm64-zip': /^markbreak-win-arm64-.+\.zip$/,
    'mac-arm64-dmg': /^markbreak-mac-arm64-.+\.dmg$/,
    'mac-x64-dmg': /^markbreak-mac-x64-.+\.dmg$/,
    'linux-x64-appimage': /^markbreak-linux-\d.+\.AppImage$/,
    'linux-x64-deb': /^markbreak-linux-\d.+\.deb$/,
    'linux-x64-rpm': /^markbreak-linux-\d.+\.rpm$/,
    'linux-x64-snap': /^markbreak-linux-\d.+\.snap$/,
    'linux-x64-targz': /^markbreak-linux-\d.+\.tar\.gz$/,
    'linux-arm64-appimage': /^markbreak-linux-arm64-.+\.AppImage$/,
    'linux-arm64-deb': /^markbreak-linux-arm64-.+\.deb$/,
    'linux-arm64-rpm': /^markbreak-linux-arm64-.+\.rpm$/,
    'linux-arm64-targz': /^markbreak-linux-arm64-.+\.tar\.gz$/,
  }
  const assetUrls = {}
  const buildSelect = document.getElementById('build-select')
  const buildLink = document.getElementById('build-link')
  if (!buildSelect || !buildLink) return

  const syncBuildLink = () => {
    buildLink.href = assetUrls[buildSelect.value] ?? releasesPage
  }
  const preferBuild = () => {
    const ua = navigator.userAgent
    if (/Windows/i.test(ua)) return 'win-x64-setup'
    if (/Mac OS X|Macintosh/i.test(ua)) return 'mac-arm64-dmg'
    if (/Linux/i.test(ua)) return 'linux-x64-appimage'
    return 'win-x64-setup'
  }

  buildSelect.value = preferBuild()
  buildSelect.addEventListener('change', syncBuildLink)
  syncBuildLink()

  fetch('https://api.github.com/repos/13-Books/markbreak-app/releases/latest')
    .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
    .then((release) => {
      for (const [key, pattern] of Object.entries(assetPatterns)) {
        const asset = release.assets.find((candidate) => pattern.test(candidate.name))
        if (asset) assetUrls[key] = asset.browser_download_url
      }
      for (const link of document.querySelectorAll('a[data-asset]')) {
        link.href = assetUrls[link.dataset.asset] ?? releasesPage
      }
      syncBuildLink()
    })
    .catch(() => {})
})()
