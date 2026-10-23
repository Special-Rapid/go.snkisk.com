[日本語](README-ja.md)

# sinkaisoku.com / go.snkisk.com

Source code for a conditional URL shortener serving the same short paths on `sinkaisoku.com` and `go.snkisk.com`.

## Current structure and migration history

The browser TypeScript migration is complete, with 28 fixed generation targets. Counts of generated targets and remaining handwritten JavaScript, Draft status, pending integration, and pending production delivery in the stage descriptions below refer to the time of introduction, rather than the current work status. See [browser/README.md](browser/README.md) for current editable sources and generation contracts, and [extension/README.md](extension/README.md) for the Chrome extension.

## Local development and verification

Use Node.js 22.18 or later. Install dependencies and verify with:

```sh
npm ci
npm run typecheck
npm run check:extension
npm run check:locked-page
npm test
```

Start the local development server with `npm run dev`. Actual creation and management operations require bindings such as D1 and the Secret/Access configuration below. Image responses in tests are mocked, but Miniflare startup may fetch Cloudflare's `cf.json`, so the entire test suite is not necessarily offline.

## Features

- Create short URLs with a chosen or automatically generated short path.
- Manage destinations, paths, and publication conditions of existing links.
- Set publication start times, expiry, usage limits, scheduled destination switching, and passphrase protection.
- Choose a display or redirect URL when a limit or expiry is reached.
- Create entry URLs with separate expiry, display, and social previews for different recipients or purposes.
- Display social/chat OG previews and QR codes for public URLs only.
- Support Japanese/English and light/dark themes.

## Behavior

Opening a link checks expiry, publication start/passphrase, usage count, and scheduled destination switching, in that order. Unset conditions are skipped; normal operation redirects to the registered destination URL.

Access history, IP addresses, and User-Agent values are not stored. Only links with usage limits retain aggregate usage counts to enforce those limits.

## Publication

This repository publishes the implementation of `sinkaisoku.com` and `go.snkisk.com`. It contains no operational secrets. In particular, manage `TURNSTILE_SECRET` as an external Worker Secret and never add it to the repository.

Instructions for initializing the creation form with query parameters are at `https://docs.sinkaisoku.com/query` (or `https://docs.go.snkisk.com/query`). Both documentation hosts are assigned to the Worker; Turnstile allows the two public service hosts.

## Admin dashboard

Protect both `/admin/` and `/api/admin/*` with Cloudflare Access applications covering both destinations. The Worker also verifies the signature, issuer, and AUD of `Cf-Access-Jwt-Assertion`. Configure these Worker Secrets before deployment:

- `ACCESS_TEAM_DOMAIN`: `<team>.cloudflareaccess.com`
- `ACCESS_ADMIN_AUDS`: comma-separated AUD values for the Access applications protecting `/admin/*` and `/api/admin/*`.

Administrative forced operations are recorded in `admin_audit_events` for 90 days; a daily Cron deletes expired records. Link deletion is logical deletion, and deleted short paths cannot be reused. Access history, IP addresses, and User-Agent values are not stored.

## Static preview image

`GET /assets/share-preview-amber-waves.jpg` is a compatibility route retrieving the original 800×400 JPEG from the public CDN. `src/static-media.ts` pins the URL, SHA256, 49793 bytes, and MIME type. Only images passing status, MIME, size, signature, and hash checks return the existing 200 status and cache headers. CDN failures or mismatches return 502/no-store. Query parameters and user authentication headers are not forwarded to the CDN. The image body and base64 are not stored in Git. To change it, update the mapping and tests after the owner confirms the CDN original.

```sh
npm ci
npm run typecheck
npm test
```

Tests mock CDN access and do not reupload the original image.

Handwritten tests are `test/*.test.mts`, executed directly as TypeScript with Node.js 22.18 or later. `npm run typecheck` strictly checks the Worker, tests, extension, and generation tools. Generated JavaScript test files are not stored. See [extension/README.md](extension/README.md) for Chrome extension sources and generation steps.

## Checking private work records

Work records, state matrices, and verification evidence remain in private local `docs/`; they are not staged, committed, pushed, or publicly served. In a dedicated worktree, update and read back the primary checkout's existing feature/task records. Public PRs include only results suitable for publication; reviews use actual readings of the private records. The records themselves are not added to the public diff.

## Browser handling before publication

[browser/README.md](browser/README.md) documents the editable source and generation contract for automatic navigation after the publication time. `npm run typecheck` also strictly checks this browser behavior. `npm run build:locked-page` generates the string embedded in the Worker; `npm run check:locked-page` checks it for a match. These inputs and outputs are separate from Chrome extension generation. This stage preserved the pre-publication page's appearance/interactions, leaving other inline JavaScript for later stages of parent Issue #7.

### Creation preview label migration

[Issue #15](https://github.com/Special-Rapid/go.snkisk.com/issues/15) moved preview label embedded JavaScript to the [browser sources](browser/README.md). It retained `npm run build:locked-page` / `npm run check:locked-page`, generating/checking two fixed targets together with pre-publication behavior. Existing label text, events, and HTML insertion positions were preserved; other embedded JavaScript and public documentation were unchanged.

### Creation guidance translation migration

[Issue #17](https://github.com/Special-Rapid/go.snkisk.com/issues/17) moved one guidance translation unit to the [browser sources](browser/README.md). The existing commands then covered three fixed targets, preserving bytes and compatibility of the two previous outputs. Japanese/English guidance, language-change/DOMContentLoaded events, and public documentation links were unchanged. The remaining 25 inline units were later work under parent Issue #7.

### Condition heading translation migration

[Issue #19](https://github.com/Special-Rapid/go.snkisk.com/issues/19) moved condition heading translation to the [browser sources](browser/README.md). Generation then covered four fixed targets. Dictionaries, deferred execution, input events, and count displays were preserved. Parent Issue #7 then had 24 handwritten embedded JavaScript locations remaining.

## Theme initialization TypeScript source

[Issue #21](https://github.com/Special-Rapid/go.snkisk.com/issues/21) moved theme initialization to the sources in [browser/README.md](browser/README.md). Generation then covered five fixed targets; earlier counts are introduction history. Synchronous saved-value reads, the `auto` fallback for invalid values/exceptions, and execution order within the head were preserved. Parent Issue #7 then had 23 handwritten embedded JavaScript locations remaining.

## Creation form terminology translation

The `create-form-terms-locale.ts` source from [Issue #23](https://github.com/Special-Rapid/go.snkisk.com/issues/23) starts only for an initial document language of `en`, then translates four expiry/end-display/end-message/local-time labels without checking the language again. It preserves initial RAF, added-Node MutationObserver, text walker, excluded tags, surrounding whitespace, and synchronous traversal order. Added text traverses its parent; an added Element traverses that Element. Language selection/persistence/switching were not moved here.

Missing dictionary values use `string | undefined`; traversal arguments/arrays use Node types under strict checking, without type assertions. Generation then covered six sources, adding `src/create-form-terms-locale-script.ts`; the five previous outputs remained byte-identical. Earlier counts are introduction history. Parent Issue #7 then had 22 handwritten locations remaining.

## Creation guidance resynchronization

The `setting-info-locale-refresh.ts` source from [Issue #25](https://github.com/Special-Rapid/go.snkisk.com/issues/25) registers DOMContentLoaded once, then dispatches change with bubbles=true to existing condition toggle inputs when it fires. It next checks document language and translates five labels only for `en` with an existing HTMLElement studio. It preserves the order reflecting event-driven language/DOM changes, stopping later processing on exceptions, excluded tags, whitespace, and replacement via replace. Language/settings persistence and switching are unchanged.

Missing dictionary values use `string | undefined`; traversal arrays use Node types under strict checking, without type assertions. Generation then covered seven sources, adding `src/setting-info-locale-refresh-script.ts`; the six previous outputs remained byte-identical. Earlier counts are introduction history. Parent Issue #7 then had 21 handwritten locations remaining.

## Dynamic creation text translation

The `create-form-dynamic-locale.ts` source from [Issue #27](https://github.com/Special-Rapid/go.snkisk.com/issues/27) starts translating five labels for initial `en`, without rechecking language. Initial RAF collects all text Nodes before conversion. characterData/added text convert only that Node directly; added Elements are traversed. This differs from the previous terminology translation's traversal of an added text Node's parent. Excluded tags, whitespace, childList/subtree/characterData observation, and insertion order are preserved.

Four annotations cover missing dictionary values, conversion/traversal arguments, and Node arrays under strict checking, without type assertions. Generation then covered eight sources, adding `src/create-form-dynamic-locale-script.ts`; the seven previous outputs remained byte-identical. Earlier counts are introduction history. Parent Issue #7 then had 20 handwritten locations remaining.

### Home supplementary translation source

The `home-polish-locale.ts` source from [Issue #29](https://github.com/Special-Rapid/go.snkisk.com/issues/29) starts translating three supplementary labels for initial `en`, without rechecking language. It excludes parent/ancestor `[data-no-i18n]`, preserving excluded tags and whitespace. RAF collects all text Nodes from the body at execution time before conversion. characterData/added text convert only the target directly; added Elements are traversed.

Only four annotations for missing dictionary values, conversion/traversal arguments, and Node arrays are used, without type assertions. Generation then covered nine sources, adding `src/home-polish-locale-script.ts`; the eight previous outputs remained byte-identical. Earlier counts are history. Parent Issue #7 then had 19 handwritten locations remaining.

### Entry expiry supplementary translation source

The `entry-expiry-locale.ts` source from [Issue #31](https://github.com/Special-Rapid/go.snkisk.com/issues/31) starts for initial `en`, without rechecking language. Text first checks parent/ancestor `[data-no-i18n]` and excluded tags, then collects all text before whitespace-preserving conversion. Subsequent placeholder traversal covers only descendants, excluding the root, and retains the existing contract of not applying text exclusion conditions. Body at RAF time, direct characterData/added text conversion, added Element traversal, and absence of attributes observation are preserved.

Only four annotations for missing dictionary values, conversion Node, traversal Element, and Node arrays are added under strict checking. Generation then covered ten sources, adding `src/entry-expiry-locale-script.ts`; the nine previous outputs remained byte-identical. Earlier counts are history. Parent Issue #7 then had 18 handwritten locations remaining.

### Completion and management supplementary translation

`browser/completion-locale.ts` is the strict source for the eleventh fixed output `src/completion-locale-script.ts`, embedded in shared pages. It starts only for initial `en`, without reassessing later language changes. Text parent/ancestor data-no-i18n exclusions, excluded tags, whitespace, body at RAF time, collecting all text before conversion, direct characterData/added text conversion, and added Element traversal are preserved. Among the 12 dictionary labels, `期限: ` has trailing whitespace in its key, preserving the existing failure to match lookup after trimming. Only four type annotations are added, preserving the previous ten outputs' bytes, three observation options, and insertion order.

### Translation of 45 creation form labels

`browser/create-form-locale.ts` is the strict source for the twelfth fixed output `src/create-form-locale-script.ts`. It starts only for initial `en` and checks language on every convert. After starting in English, it skips conversion while not `en`, then converts on notifications after returning to `en`. SCRIPT/STYLE/TEXTAREA are excluded; OPTION is translated. It retains the contract of not adding data-no-i18n ancestor exclusions. Whitespace, body at RAF time, collecting all Text before conversion, direct characterData/added Text conversion, added Element traversal, three observation options, and insertion order are preserved. Only four type annotations are added; the previous eleven outputs remain byte-identical.

### Validation translation and date formatting

[Issue #37](https://github.com/Special-Rapid/go.snkisk.com/issues/37) uses strict `browser/validation-locale.ts` for the thirteenth fixed output `src/validation-locale-script.ts` at the same position. It preserves 22 fixed labels, four regular expressions, captures, whitespace, parent/ancestor data-no-i18n, and four excluded tags. It starts only for initial `en`, without rechecking later language. Date formatting follows collection/conversion of all Text from the body at RAF time; direct characterData/added Text conversion and added Element traversal do not format dates. Date NaN checks, Intl zone/shortOffset/dateStyle/timeStyle, three observation options, and order are preserved. Only annotations for missing dictionary values, string arguments, Node/Node arrays, and the HTMLElement type argument for the existing HTML time querySelectorAll are added. There are no type assertions; the previous twelve outputs remain byte-identical. Earlier counts are history. Parent #7 then had 15 handwritten locations remaining.

### Condition card controls

[Issue #39](https://github.com/Special-Rapid/go.snkisk.com/issues/39) uses strict `browser/condition-card.ts` for the fourteenth fixed output `src/condition-card-script.ts` at the same position. It preserves toggle-driven visibility, control disabled states, limit redirect settings, form synchronization events, hash decoding/membership checks/details expansion/RAF scroll, and period customValidity/required/checkValidity/reportValidity at submit. Period input/change clears customValidity. Only two type argument locations are added: input/select/textarea union for control enumeration, and input types for the two period IDs. No type assertions are used; the previous thirteen outputs remain byte-identical. Earlier counts are history. Parent #7 then had 14 handwritten locations remaining.

### Creation form state management

[Issue #41](https://github.com/Special-Rapid/go.snkisk.com/issues/41) uses strict `browser/create-state.ts` for the fifteenth fixed output `src/create-state-script.ts` at the same position. It preserves initial setTimeout(0), studio/form type guards, URL validation display in the current language, Turnstile success/expired/error state synchronization, deferred input/change synchronization, and label/slug customValidity when audience is enabled. Only three optional callbacks on shared Window and a string annotation for name are added, without type assertions. The previous fourteen outputs remain byte-identical. Earlier counts are history. Parent #7 then had 13 handwritten locations remaining.

### Conditional form synchronization

[Issue #43](https://github.com/Special-Rapid/go.snkisk.com/issues/43) uses strict `browser/condition-form-sync.ts` for the sixteenth fixed output `src/condition-form-sync-script.ts` at the same position. It preserves existing Japanese text for disabled conditions, the social preview fieldset/notice controlled by switching settings, immediate input/change/conditioncardsync synchronization, submit registration after a microtask, and removal of disabled datetime inputs and same-name hidden inputs. Only four string annotations and one type argument for the current HTML datetime input are added, without type assertions. The previous fifteen outputs remain byte-identical. Earlier counts are history. Parent #7 then had 12 handwritten locations remaining.

### Setting descriptions and info controls

[Issue #45](https://github.com/Special-Rapid/go.snkisk.com/issues/45) uses strict `browser/setting-info.ts` for the seventeenth fixed output `src/setting-info-script.ts` at the same position. It preserves headings/states/descriptions in the current language, info click/focus/blur/hover, retaining visibility on leave while focused, details expansion for hashes/input errors, and load/localechange/toggle synchronization order. Only the dictionary type and four button/tooltip/value annotations are added, preserving undefined for unknown keys and the previous sixteen outputs' bytes. Earlier counts are history. Parent #7 then had 11 handwritten locations remaining.

### Supplementary translation after language switching

[Issue #47](https://github.com/Special-Rapid/go.snkisk.com/issues/47) uses strict `browser/localization-after.ts` for the eighteenth fixed output `src/localization-after-script.ts` at the same position. Existing string dictionary registration and two translation callbacks are optional, preserving fallback when absent, registration of 19 labels, RAF traversal/excluded tags, datetime zone, title suffix, timers after input/change, and locale notification order. A unique marker is replaced with fixed `SERVICE_HOST`, adding no external input path. The previous seventeen outputs remain byte-identical; earlier counts are history. Parent #7 then had ten handwritten locations remaining.

### Query setup guidance translation

[Issue #49](https://github.com/Special-Rapid/go.snkisk.com/issues/49) uses strict `browser/docs-query.ts` for the nineteenth fixed output `src/docs-query-script.ts` at the same position. It preserves ja/en dictionaries, undefined for unknown keys, labels/title based on current lang, locale notifications, and DOMContentLoaded once order. Current HTML has eight `data-docs-copy` elements; not all 15 dictionary entries are assumed present in the DOM. Existing `escapeHtml(docsOrigin)` is restored by replacing a unique marker with a callback, preserving replacement special characters literally. The previous eighteen outputs remain byte-identical; earlier counts are history. Parent #7 then had nine handwritten locations remaining.

### Unused supplementary translation definition

[Issue #51](https://github.com/Special-Rapid/go.snkisk.com/issues/51) uses strict `browser/localization-polish.ts`, restoring the existing definition from the twentieth fixed output `src/localization-polish-script.ts`. Current `localizationPolishScript` is defined but not inserted into HTML. No call/embedding is added and the definition is not deleted. Initial `en` detection, 19 labels, whitespace, excluded tags, zone/title, optional translation callbacks, MutationObserver processing, and exceptions are preserved. Fixed `SERVICE_HOST` interpolation is restored through a unique marker; the previous nineteen outputs' bytes and complete Worker HTML are preserved. Earlier counts are history. Parent #7 then had eight handwritten locations remaining.

### Shared translation behavior

[Issue #53](https://github.com/Special-Rapid/go.snkisk.com/issues/53) uses strict `browser/localization-core.ts` for the twenty-first fixed output `src/localization-core-script.ts` at the same shared layout position. Saved ja/en values take priority over the OS; otherwise existing OS detection chooses ja if any ja candidate exists, or en otherwise. Manual selection persistence, removal for auto, text/placeholder/alt dictionaries, observer disconnect/reconnect, and locale notification order are unchanged. Only type annotations are added, preserving existing prototype-key exceptions and zone labels without mixing behavior improvements into this stage. The previous twenty outputs remain byte-identical; earlier counts are history. Parent #7 then had seven handwritten locations remaining.

## Typed query preset source

[Issue #55](https://github.com/Special-Rapid/go.snkisk.com/issues/55) uses editable `browser/create-query-preset.ts` for creation form query presets, with fixed `src/create-query-preset-script.ts` at the same position. Generation then covered 22 targets. Allowed parameters/value validation, condition toggles, notification order, and exclusion of `restore=1` were preserved. Six remaining handwritten locations, production delivery, and browser verification were separate work at that stage.

## Typed English rule summary source

[Issue #57](https://github.com/Special-Rapid/go.snkisk.com/issues/57) uses editable `browser/create-rule-locale.ts` for English rule summary synchronization, with fixed `src/create-rule-locale-script.ts` at the original position. Generation then covered 23 targets. The `en` check at timer execution, expiry/count/switch labels, input/change resynchronization, DOM read counts, and existing exceptions were preserved. Type syntax on repeated reads is erased at runtime and does not add input validation. Five remaining handwritten locations, browser verification, and production delivery were separate work at that stage.

## Typed theme behavior source

[Issue #59](https://github.com/Special-Rapid/go.snkisk.com/issues/59) uses editable `browser/theme-controls.ts` for shared layout theme behavior, with fixed `src/theme-controls-script.ts` at the original position. Generation then covered 24 targets. System/Light/Dark, OS tracking, manual persistence, localized labels, menu closing/summary focus, legacy listeners, dataset read counts, and existing exceptions were preserved. UI theme selection is passed to existing radio controls. Erased generic/non-null syntax does not add runtime validation. Four remaining handwritten locations, browser verification, and production delivery were separate work at that stage.

## Typed language/theme selection source

[Issue #61](https://github.com/Special-Rapid/go.snkisk.com/issues/61) uses editable `browser/locale-picker.ts` for shared layout selection buttons, with fixed `src/locale-picker-script.ts` retaining existing HTML/CSS and insertion order. Generation then covered 25 targets. click/arrow keys/Home/End/RAF focus, theme radio connections, language callback/select fallback, OS tracking, observer/meta synchronization, saved values, repeated reads, unknown/prototype values, and existing exceptions were preserved. One erased non-null annotation and a callback argument type do not add runtime validation. Three remaining handwritten locations, browser verification, and production delivery were separate work at that stage.

## Typed form recovery source

[Issue #63](https://github.com/Special-Rapid/go.snkisk.com/issues/63) uses editable `browser/create-form-recovery.ts` for creation form persistence/recovery, with fixed `src/create-form-recovery-script.ts` at the original position. Generation then covered 26 targets. Submit listener/restore order, sessionStorage exclusions, existing recovery/exceptions, each control/toggle, form events, and error focus calls were preserved. JSON.parse-derived annotations describe an unvalidated producer contract, without adding runtime validation. Invalid values, inherited keys, repeated reads, and partial exceptions retain their behavior. Two remaining handwritten locations, browser verification, and production delivery were separate work at that stage.

## Typed extension communication source

[Issue #65](https://github.com/Special-Rapid/go.snkisk.com/issues/65) uses editable `browser/extension-create.ts` for the bridge, with fixed `src/extension-create-script.ts` at the existing position. Generation then covered 27 targets. Only existing trusted origin constants are replaced with JSON strings. Origin/parent window/popup source checks, reading targetUrl twice, ready/error/token notifications, and Turnstile callback order were preserved. MessageEvent data types describe an unvalidated producer contract, without adding a runtime validator. Invalid values, repeated getters, partial exceptions, and the existing empty-string token condition retain their behavior. One remaining handwritten unit, real Chrome/Turnstile verification, and production delivery were separate work at that stage.

## Typed shared layout tail source

[Issue #67](https://github.com/Special-Rapid/go.snkisk.com/issues/67) uses editable `browser/layout-tail.ts` for all 12 shared layout tail statements, with fixed `src/layout-tail-script.ts` at the original position. Generation covers 28 targets. Copying, passphrase display, slug checks, local time, usage count, condition toggles, social previews, form summary order, and existing exceptions are preserved. JSON response types describe an unvalidated producer contract, without adding a runtime validator. Shared host constants use a unique marker/callback replacement. The previous 27 outputs remained byte-identical; this stage reduced remaining handwritten migration units to zero. Browser verification, stacked PR integration, and production delivery were separate work at that stage.


## License

This project is licensed under the [MIT License](LICENSE), copyright (c) 2026 Special-Rapid. Third-party dependencies retain their own licenses and notices.
