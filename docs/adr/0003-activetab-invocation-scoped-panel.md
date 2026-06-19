# ADR 0003: Keep `activeTab`; the panel is invocation-scoped

- **Status:** Accepted
- **Date:** 2026-06-20
- **Relates to:** CLAUDE.md invariant #6 (minimal permissions); ADR 0001 (the
  panel resolves the active tab and renders its context).

## Context

The side panel must read the active tab's URL to render: the header shows
`Editing: <host>`, the editor pre-loads that site's saved CSS, and
`isInjectableUrl(url)` decides whether the page can be styled.

We shipped with `activeTab` as the only tab-access permission **plus**
`chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`. That
combination is broken: `openPanelOnActionClick` *consumes* the toolbar click to
open the panel, so `action.onClicked` never fires — and `onClicked` is the event
that grants `activeTab`. The result is that the panel never receives a host grant
for any tab, so `chrome.tabs.query({ active: true })` returns a tab whose `url`
is `undefined`, `isInjectableUrl(undefined)` is `false`, and a perfectly
styleable page (e.g. `youtube.com`) shows "No site" / "This page can't be
styled." Confirmed live: the query returned `{ id: <number> }` with no `url`.

The fix needs to restore URL access without weakening the privacy posture.

## Decision

**Keep `activeTab`-only. Make the panel invocation-scoped, and grant `activeTab`
correctly by handling the action click ourselves.**

1. **Drop `openPanelOnActionClick`. Add an `action.onClicked` listener** that
   calls `chrome.sidePanel.open({ windowId })`. `onClicked` firing *is* the
   `activeTab` grant for the invoked tab, and `open()` runs inside that same user
   gesture — so one click both grants access and opens the panel.

2. **The grant persists usefully.** `activeTab` lasts until the tab does a
   cross-document navigation or closes; switching tabs away and back does not
   revoke it, and same-document (SPA) navigations don't either. So a site stays
   readable after a single invocation for as long as the user keeps browsing it.

3. **Distinguish "not yet activated" from "unstyleable."** `buildContext` sets
   `needsActivation = (tab.id != null && url == null)`. When a live tab's URL is
   hidden (no grant yet), the panel shows **"Click the Stylewright icon in your
   toolbar to edit this site."** — not the misleading "can't be styled," which is
   reserved for pages with a *known* non-injectable URL (`chrome://`, the web
   store). We cannot read a `chrome://` URL without a grant either, so such pages
   also show the activation prompt; clicking simply does nothing there, which is
   acceptable.

4. **Re-key after the grant.** The icon click fires no tab/focus event, so an
   already-open panel wouldn't know access changed. The worker sends a
   `panelRefresh` notification after opening; the panel re-reads context on
   receipt. A freshly opened panel covers itself via its init `refresh()`.

Manual **Apply** continues to use `activeTab` (now reliably granted) with the
existing `NEEDS_PERMISSION:<origin>` retry as a fallback. Auto-apply still
requires its persistent per-origin grant (ADR 0002) — unchanged.

**Rejected — add the `tabs` permission.** `tabs` would let the panel read every
tab's URL with no gesture, enabling a panel that auto-populates as you browse.
But it triggers the **"Read your browsing history"** install warning, which
undercuts the privacy-first, minimal-permission pitch that is the point of this
extension. The cost it buys back is small: one toolbar click per site you choose
to style — and you are deliberately choosing that site anyway. Not worth the
warning.

**Rejected — broad `host_permissions`.** Strictly more powerful than `tabs`
(content + scripting on every site) and trips the "all your data on all websites"
warning. Never in scope for invariant #6.

## Consequences

- **No new install warning.** Invariant #6 holds in full: `activeTab` + scripting
  + storage, no `tabs`, no blanket host permissions.
- **The panel does not auto-follow into un-invoked tabs.** This is a deliberate
  UX trade: the panel works on sites you've clicked the icon on (and stays
  working as you browse them); brand-new sites show a one-line prompt. CLAUDE.md's
  "follows the user across tabs" now means "re-keys and shows context where it has
  access; prompts otherwise," not "reads every tab unprompted."
- **Invariants #1, #2, #4, #5 unchanged.** No network, local-only storage,
  storage-as-source-of-truth, and the `innerHTML` ban all stand.
- The store listing can truthfully say the extension reads a site's URL only
  after you invoke it there, and nothing leaves the device.

## Security notes

- `activeTab` is gesture-scoped and per-tab; the extension can see a URL only for
  a tab the user explicitly pointed it at.
- No change to `inject.ts`, the CSP, or the `innerHTML` ban.
- The `url()`/`@import` exfiltration note from ADR 0001 is unaffected.
