/**
 * Saves a file from the app. On phones that can share files (e.g. iPhone), the share sheet opens,
 * so it can go to iCloud Files / Google Drive or be sent to yourself. Otherwise it downloads.
 * Note: Chrome on Android can't share .json files, so there it downloads to the Downloads folder.
 */
export async function saveFile(file: File, { preferDownload = false } = {}): Promise<'shared' | 'downloaded' | 'cancelled'> {
  if (!preferDownload && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
      // Sharing failed for another reason: fall back to a download.
    }
  }
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}
