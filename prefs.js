import Adw from 'gi://Adw'
import Gtk from 'gi://Gtk'

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'

export default class PasswordStorePreferences extends ExtensionPreferences {
  fillPreferencesWindow (window) {
    const settings = this.getSettings()

    const page = new Adw.PreferencesPage()
    const group = new Adw.PreferencesGroup({
      title: 'Password Store Settings'
    })

    const entry = new Gtk.Entry({
      hexpand: true
    })
    entry.set_text(settings.get_string('example-key'))
    entry.connect('changed', () => {
      settings.set_string('example-key', entry.get_text())
    })

    const row = new Adw.ActionRow({
      title: 'Example Setting'
    })
    row.add_suffix(entry)
    row.activatable = false

    group.add(row)
    page.add(group)
    window.add(page)
  }
}
