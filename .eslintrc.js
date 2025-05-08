module.exports = {
  env: {
    es2021: true
  },
  globals: {
    imports: 'readonly',
    log: 'readonly',
    globalThis: 'readonly',
    GLib: 'readonly',
    Gio: 'readonly',
    St: 'readonly',
    GObject: 'readonly',
    Clutter: 'readonly',
    Meta: 'readonly',
    Shell: 'readonly'
  },
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    // Add your rules
  }
}
