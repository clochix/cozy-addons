#!/bin/sh
while true; do inotifywait -e close_write,moved_to,create,modify init.js pgp.html pgp.css ; ../node_modules/.bin/inliner -vi http://clochix.net/cozy-addons/pgp/pgp.html > index.html; done
