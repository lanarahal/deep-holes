# Deep Holes — Sprint 02

## Critical GitHub Pages fix
- Fixed a JavaScript syntax error in `js/social-ui.js` that prevented the entire ES module graph from loading.
- Because `main.js` imports `social-ui.js`, the syntax error stopped initialization before wallet listeners, buy buttons, map rendering, and all other game interactions were registered.
- Bumped cache-busting query strings from `v=9` to `v=10` so GitHub Pages/browser caches load the repaired modules.

## Validation
- Ran `node --check` against every JavaScript file in `js/` successfully.
- Verified the previous parser failure in `social-ui.js` is resolved.
