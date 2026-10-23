# Chrome extension

The popup's editable source is `popup.ts`; `chrome.d.ts` defines the Chrome API types it uses. Chrome reads `popup.js` directly, so this generated file is tracked in Git. Together with the manifest, HTML, and CSS, this directory can be loaded as an unpacked development extension.

Run from the repository root with Node.js 22.18 or later:

```sh
npm ci
npm run typecheck
npm run build:extension
npm run check:extension
```

`build:extension` generates output in a temporary directory using the dedicated compiler configuration, then updates `popup.js`. `check:extension` checks byte-for-byte equality with the same generated output and fails if it differs. Include source and generated output in the same commit; do not edit generated output directly. CI also checks for a match.

The popup preserves existing bridge message validation, short URL creation, locale/theme persistence, and QR saving. The type declarations describe the APIs in use; they do not add manifest permissions.

Work records and state matrices remain in the existing private local `docs/`. This README documents the public editing and generation contract; the work records themselves are not included in public distribution.
