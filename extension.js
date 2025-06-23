import GLib from 'gi://GLib'
import St from 'gi://St'
import GObject from 'gi://GObject'
import Meta from 'gi://Meta'
import Shell from 'gi://Shell'
import Clutter from 'gi://Clutter'

import * as Main from 'resource:///org/gnome/shell/ui/main.js'
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js'
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js'
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';


import {
  enumeratePasswordStoreEntries,
  formatEntryLabel,
  logDebug,
  getPassword,
  sanitizePassRoute,
  resolveParentDir,
  filterMatchingEntries
} from './utils.js'

import {
  createHeaderBox,
  createScrollWrapper,
  createEntryRow,
  createFooterBox
} from './ui.js'

const PasswordManager = GObject.registerClass(
  class PasswordManager extends PanelMenu.Button {
    _init (getPasswordFn, settings) {
      super._init(0.0, 'Passwordstore', false)
      this._getPassword = getPasswordFn
      this._settings = settings
      this._current_directory = '/'
      this._allEntries = []

      const icon = new St.Icon({ icon_name: 'dialog-password-symbolic', style_class: 'system-status-icon' })
      const box = new St.BoxLayout({ style_class: 'panel-status-menu-box' })
      box.add_child(icon)
      this.add_child(box)

      const menu = new PopupMenu.PopupMenu(this, Clutter.ActorAlign.START, St.Side.TOP)
      this.setMenu(menu)
      this.popupMenu = menu

      Main.panel.addToStatusArea('passwordManager', this)
      this._drawDirectory()

      Main.wm.addKeybinding(
        'show-menu-keybinding',
        this._settings,
        Meta.KeyBindingFlags.NONE,
        Shell.ActionMode.ALL,
        () => {
          this.popupMenu.open()
        }
      )

      // Focus search after popup is shown
      this.popupMenu.connect('open-state-changed', (menu, isOpen) => {
        if (isOpen) {
          if(this._lastKeyBoardGrabEventTimeout) {
            GLib.source_remove(this._lastKeyBoardGrabEventTimeout)
          }

          this._lastKeyBoardGrabEventTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            if (this._searchEntry && this._searchEntry.mapped) {
              this._searchEntry.grab_key_focus()
            } else if (this._searchEntry) {
              this._searchEntry.clutter_text.grab_key_focus()
            }
            return GLib.SOURCE_REMOVE
          })
        }
      })
    }

    destroy () {
      if (this._motionHandler) {
        global.stage.disconnect(this._motionHandler) // eslint-disable-line no-undef
        this._motionHandler = null
      }
      if(this._lastKeyBoardGrabEventTimeout) {
        GLib.source_remove(this._lastKeyBoardGrabEventTimeout)
      }
      Main.wm.removeKeybinding('show-menu-keybinding')
      super.destroy()
    }

    _changeDir (dir) {
      const path = `.password-store/${dir}`
      if (!GLib.file_test(path, GLib.FileTest.IS_DIR)) {
        logDebug(`Not a valid directory: ${path}`)
        return
      }

      this._current_directory = dir
      this._drawDirectory()
      this.popupMenu.box.get_first_child()?.grab_key_focus()
    }

    _drawDirectory () {
      this.menu.removeAll()

      const headerItem = createHeaderBox(this._current_directory, () => {
        const upDir = resolveParentDir(this._current_directory)
        this._changeDir(upDir)
      })

      this.menu.addMenuItem(headerItem)

      const contentBox = new St.BoxLayout({
        vertical: true,
        style_class: 'pass-scrollbox'
      })
      this._contentBox = contentBox

      const wrapper = createScrollWrapper(contentBox)
      this.menu.addMenuItem(wrapper)

      this._allEntries = enumeratePasswordStoreEntries(this._current_directory)
      this._filterEntries('')
      this._drawFooter()
    }

    _drawFooter () {
      if (this._footerBox) {
        this.menu.box.remove_child(this._footerBox)
      }

      this._searchEntry = new St.Entry({
        style_class: 'pass-search-entry',
        hint_text: 'Search passwords...',
        can_focus: true,
        x_expand: true
      })

      this._searchEntry.clutter_text.connect('text-changed', () => {
        const query = this._searchEntry.get_text()
        this._filterEntries(query)
      })

      const footerBox = createFooterBox(this._searchEntry, () => {
        try {
          this.openPreferences()
        } catch (e) {
          logError(e, '[passwordstore] Failed to open settings') // eslint-disable-line no-undef
        }
      })

      this.menu.box.add_child(footerBox)
      this._footerBox = footerBox
    }

    _filterEntries (query) {
      const contentBox = this._contentBox
      contentBox.destroy_all_children()

      const filtered = filterMatchingEntries(this._allEntries, query)
      for (const item of filtered) {
        const label = formatEntryLabel(item.name, item.isDir)
        const icon = item.isDir ? 'folder-symbolic' : 'changes-prevent-symbolic'

        const row = createEntryRow(label, icon, () => {
          if (item.isDir) {
            this._changeDir(this._current_directory + item.name + '/')
          } else {
            const cleanRoute = sanitizePassRoute(this._current_directory + item.name)
            this._getPassword(cleanRoute)
          }
        })

        contentBox.add_child(row)
      }
    }
  }
)

export default class PassStoreManager extends Extension {
  enable () {
    // TODO
    // this._settings = this.getSettings();
    this.passwordManager = new PasswordManager(getPassword, this._settings)
  }

  disable () {
    if (this.passwordManager) {
      this.passwordManager.destroy()
      this.passwordManager = null
      // TODO
      // this._settings = null
    }
  }
}
