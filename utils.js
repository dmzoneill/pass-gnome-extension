import GLib from 'gi://GLib'
import Gio from 'gi://Gio'
import St from 'gi://St'
import * as Main from 'resource:///org/gnome/shell/ui/main.js'

export function resolveParentDir (path) {
  const parts = path.split('/').filter(Boolean)
  return parts.length > 0 ? parts.slice(0, -1).join('/') + '/' : '/'
}

export function filterMatchingEntries (entries, query) {
  return entries.filter(item => {
    const label = formatEntryLabel(item.name, item.isDir)
    return !query || isEntryMatch(label, query)
  })
}

export function enumeratePasswordStoreEntries (directory) {
  const path = `.password-store/${directory}`
  const fd = Gio.file_new_for_path(path)

  let enumerator
  try {
    enumerator = fd.enumerate_children('standard::*', 0, null)
  } catch (e) {
    logDebug(`[passwordstore] Failed to read directory: ${e}`)
    return []
  }

  const entries = []
  let entry
  while ((entry = enumerator.next_file(null))) {
    const name = entry.get_name()
    if (!name.startsWith('.')) {
      entries.push({
        name,
        isDir: entry.get_file_type() === Gio.FileType.DIRECTORY
      })
    }
  }

  entries.sort((a, b) => {
    if (a.isDir && !b.isDir) return -1
    if (b.isDir && !a.isDir) return 1
    return a.name.localeCompare(b.name)
  })

  return entries
}

export function formatEntryLabel (name, isDir) {
  return isDir ? `${name}/` : name.replace(/\.gpg$/, '')
}

export function isEntryMatch (label, query, threshold = 3) {
  const labelLower = label.toLowerCase()
  const queryLower = query.toLowerCase()
  return (
    labelLower.includes(queryLower) ||
      levenshteinDistance(labelLower, queryLower) <= threshold
  )
}

export function logDebug (message) {
  log(`[passwordstore] ${message}`) // eslint-disable-line no-undef
}

export function getPassword (route) {
  GLib.spawn_command_line_async(`pass ${route}`)

  const [ok, stdout, stderr, status] = GLib.spawn_sync( // eslint-disable-line no-unused-vars
    null,
    ['pass', 'show', route.replace(/^\//, '').replace(/\.gpg$/, '')],
    null,
    GLib.SpawnFlags.SEARCH_PATH,
    null
  )

  if (ok && stdout) {
    const output = new TextDecoder().decode(stdout).split('\n')[0].trim() // eslint-disable-line no-undef
    St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, output)
    logDebug(`Password copied to clipboard: ${route}`)
    Main.notify('Password Manager', `Password for "${route}" copied to clipboard.`)
  } else {
    logDebug(`Failed to get password for ${route}: ${stderr}`)
    Main.notify('Password Manager', `Failed to copy password for "${route}".`)
  }
}

export function levenshteinDistance (a, b) {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

export function sanitizePassRoute (route) {
  return route.replace(/^\//, '').replace(/\.gpg$/, '')
}
