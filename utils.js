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
  console.log(`[passwordstore] ${message}`) // eslint-disable-line no-undef
}



/**
 * Execute a command asynchronously and check the exit status.
 *
 * If given, @cancellable can be used to stop the process before it finishes.
 *
 * @param {string[]} argv - a list of string arguments
 * @param {Gio.Cancellable} [cancellable] - optional cancellable object
 * @returns {Promise<boolean>} - The process success
 */
async function execCheck(argv, cancellable = null) {
    let cancelId = 0;
    const proc = new Gio.Subprocess({
        argv,
        flags: Gio.SubprocessFlags.NONE,
    });
    proc.init(cancellable);

    if (cancellable instanceof Gio.Cancellable)
        cancelId = cancellable.connect(() => proc.force_exit());

    try {
        const success = await proc.wait_check_async(null);

        if (!success) {
            const status = proc.get_exit_status();

            throw new Gio.IOErrorEnum({
                code: Gio.IOErrorEnum.FAILED,
                message: `Command '${argv}' failed with exit code ${status}`,
            });
        }
    } finally {
        if (cancelId > 0)
            cancellable.disconnect(cancelId);
    }
}


/**
 * Execute a command asynchronously and return the output from `stdout` on
 * success or throw an error with output from `stderr` on failure.
 *
 * If given, @input will be passed to `stdin` and @cancellable can be used to
 * stop the process before it finishes.
 *
 * @param {string[]} argv - a list of string arguments
 * @param {string} [input] - Input to write to `stdin` or %null to ignore
 * @param {Gio.Cancellable} [cancellable] - optional cancellable object
 * @returns {Promise<string>} - The process output
 */
async function execCommunicate(argv, input = null, cancellable = null) {
    let cancelId = 0;
    let flags = Gio.SubprocessFlags.STDOUT_PIPE |
                Gio.SubprocessFlags.STDERR_PIPE;

    if (input !== null)
        flags |= Gio.SubprocessFlags.STDIN_PIPE;

    const proc = new Gio.Subprocess({argv, flags});
    proc.init(cancellable);

    if (cancellable instanceof Gio.Cancellable)
        cancelId = cancellable.connect(() => proc.force_exit());

    try {
        const [stdout, stderr] = await proc.communicate_utf8_async(input, null);

        const status = proc.get_exit_status();

        if (status !== 0) {
            throw new Gio.IOErrorEnum({
                code: Gio.IOErrorEnum.FAILED,
                message: stderr ? stderr.trim() : `Command '${argv}' failed with exit code ${status}`,
            });
        }

        return stdout.trim();
    } finally {
        if (cancelId > 0)
            cancellable.disconnect(cancelId);
    }
}

// Safely fetch and copy password
export async function getPassword(route) {
  const sanitizedRoute = route.replace(/^\//, '').replace(/\.gpg$/, '');
  const argv = ['pass', 'show', sanitizedRoute];

  try {
    const output = await execCommunicate(argv);
    const password = output.split('\n')[0].trim();

    St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, password);
    logDebug(`Password copied to clipboard: ${route}`);
    Main.notify('Password Manager', `Password for "${route}" copied to clipboard.`);
  } catch (e) {
    logDebug(`Failed to get password for ${route}: ${e.message}`);
    Main.notify('Password Manager', `Failed to copy password for "${route}".`);
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
