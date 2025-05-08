// ui.js

import St from 'gi://St'
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js'

export function createIconButton (iconName, styleClass, onClick) {
  const icon = new St.Icon({ icon_name: iconName, icon_size: 16 })
  const button = new St.Button({ child: icon, style_class: styleClass })
  if (onClick) button.connect('clicked', onClick)
  return button
}

export function createHeaderBox (currentDirectory, onUpClicked) {
  const upButton = createIconButton('go-up-symbolic', 'pass-up-button', onUpClicked)
  const currentLabel = new St.Label({ text: currentDirectory, style_class: 'pass-header-label' })
  const headerBox = new St.BoxLayout({ vertical: false, style_class: 'pass-header-box' })
  headerBox.add_child(upButton)
  headerBox.add_child(currentLabel)

  const headerItem = new PopupMenu.PopupBaseMenuItem({ reactive: false, can_focus: false })
  headerItem.add_child(headerBox)
  return headerItem
}

export function createScrollWrapper (contentBox) {
  const scrollView = new St.ScrollView({
    overlay_scrollbars: true,
    style_class: 'pass-scrollview',
    reactive: true,
    can_focus: true,
    track_hover: true
  })

  scrollView.set_child(contentBox)
  const wrapper = new PopupMenu.PopupBaseMenuItem({ reactive: false, can_focus: false })
  wrapper.add_child(scrollView)
  return wrapper
}

export function createEntryRow (label, iconName, onActivate) {
  const row = new PopupMenu.PopupBaseMenuItem({
    reactive: true,
    can_focus: true,
    style_class: 'pass-menu-item'
  })

  row.add_child(new St.Icon({ icon_name: iconName, icon_size: 16 }))
  row.add_child(new St.Label({ text: label, x_expand: true }))

  if (onActivate) row.connect('activate', onActivate)

  return row
}

export function createFooterBox (searchEntry, onSettingsClicked) {
  const footerBox = new St.BoxLayout({
    style_class: 'pass-footer-box',
    vertical: false,
    x_expand: true
  })

  const searchEntryBox = new St.BoxLayout({
    style_class: 'pass-search-entry-box',
    vertical: false,
    x_expand: true
  })

  const searchIcon = new St.Icon({
    icon_name: 'edit-find-symbolic',
    style_class: 'pass-search-icon'
  })

  searchEntryBox.add_child(searchIcon)
  searchEntryBox.add_child(searchEntry)

  const settingsButton = new St.Button({
    style_class: 'pass-button pass-settings-button',
    child: new St.Icon({
      icon_name: 'preferences-system-windows-symbolic',
      icon_size: 16,
      style_class: 'popup-menu-icon'
    })
  })

  if (onSettingsClicked) settingsButton.connect('clicked', onSettingsClicked)

  footerBox.add_child(searchEntryBox)
  footerBox.add_child(settingsButton)

  return footerBox
}
