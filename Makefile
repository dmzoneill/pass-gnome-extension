.PHONY: all

all: clean push install uninstall super-lint

SHELL := /bin/bash
CWD := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))


INSTALL_DIR = ~/.local/share/gnome-shell/extensions/dmz.oneill@gmail.com
SCHEMA_DIR = ~/.local/share/glib-2.0/schemas

install:
	mkdir -p ~/.local/share/glib-2.0/schemas
	cp schemas/*.gschema.xml ~/.local/share/glib-2.0/schemas/
	glib-compile-schemas ~/.local/share/glib-2.0/schemas/
	@echo "Schema installed. Restart GNOME Shell with Alt+F2, then type 'r' and hit Enter (on X11)."


uninstall:
	rm -rf $(INSTALL_DIR)
	rm -f $(SCHEMA_DIR)/org.gnome.shell.extensions.passwordstoremanager.gschema.xml
	glib-compile-schemas $(SCHEMA_DIR)

clean: 
	- mv eslint.config.js.bak eslint.config.js
	rm -f tado-gnome-shell-extension.zip
	{ \
		cd schemas/; \
		rm gschemas.compiled; \
		glib-compile-schemas .; \
		cd ..; \
	}
	npx stylelint "**/*.css" --fix
	npx prettier "**/*.css" --write
	npx eslint . --ignore-pattern .eslintrc.js --fix
	npx standard --fix
	- mv eslint.config.js eslint.config.js.bak
	gjs -m extension.js



push: clean
	git add -A
	git commit --amend --no-edit 
	git push -u origin main:main -f

zip:
	zip password-store-manager-shell-extension.zip icons/ schemas/ metadata.json *.js *.css


debug:
	clear; sudo journalctl /usr/bin/gnome-shell -f -o cat

super-lint:
	- mv eslint.config.js eslint.config.js.bak
	docker run --rm \
	-e SUPER_LINTER_LINTER=error \
	-e LINTER_OUTPUT=error \
	-e LOG_LEVEL=ERROR \
	-e RUN_LOCAL=true \
	-e FILTER_REGEX_EXCLUDE="(^|/)\.git(/|$)|(^|/)backups(/|$)|(^|/)roles/[^/]+/files(/|/)" \
	-e GIT_IGNORE=true \
	-v $$(pwd):/tmp/lint \
	-w /tmp/lint \
	github/super-linter:latest --quiet

test:
	node --experimental-vm-modules node_modules/.bin/jest --verbose --runInBand
