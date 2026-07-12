# Nice Place — i18n Hardcoded String Audit

**Scope:** `src/` (+ `App.tsx`, `app.json` permission copy)  
**Updated:** 2026-07-12  
**Status:** **Frontend localization migration complete** (through Admin Panel)

**App.tsx:** no user-facing copy (shell only)

---

## Migration progress

| Area | Status | Notes |
|------|--------|-------|
| Infrastructure + language selector | **Done** | |
| Shared / navigation / auth / onboarding | **Done** | |
| Explore + Map + Place Detail | **Done** | Soft-delete under `placeDetail.admin.*` |
| Add / Edit Place | **Done** | |
| Collections / Saved | **Done** | Free collection limit UI deferred |
| Profile (+ Account edit/photo) | **Done** | |
| Settings (all remaining screens + prefs) | **Done** | |
| Notifications inbox / history | **Done** | Client templates + English historical fallback |
| Admin Panel | **Done** | Dashboard, queues, detail, reports, broadcast |
| Routes placeholder screen | **Done** | Post-launch stub localized |

### Still English / outside catalogs

| Source | Notes |
|--------|-------|
| OS permission sheets / native mail & browser | Outside JS catalogs |
| Delete confirm typed phrase | Fixed `DELETE MY ACCOUNT` (shown + compared) |
| Admin delete typed phrase | Fixed `DELETE USER` (shown + compared) |
| Support email / version numbers | Not translated |
| Suspension / moderation reasons (admin-authored) | Do not auto-translate; stored as entered |
| Default empty moderation fill | Stable `No additional reason provided` sent to API |
| Historical notification `title`/`body` DB rows | Inbox re-localizes known types when pattern/metadata match |
| Server / Expo push title & body | Edge + SQL still write English; OS notification center shows that copy |
| Custom SYSTEM / EVENT free text | Admin-authored; shown as stored |
| Reverse-geocoded addresses | Provider language |
| Raw rare PostgREST/RPC `error.message` passthroughs | Prefer mapped keys; unknown → generic |

---

## Next migration areas

None for frontend catalogs. Optional follow-ups (out of scope for this migration):

1. Backend / Edge Function push localization  
2. Premium / ads (product work, not i18n)

---

## Admin namespaces (final step)

| Namespace | Purpose |
|-----------|---------|
| `admin.access.*` / `checkingAccess` / `loadingQueue` | Gate + loading |
| `admin.panel.*` | Dashboard tools, filters, tabs, empty states, a11y |
| `admin.status.*` | Place + report status display labels |
| `admin.fields.*` / `flags.*` | Review field & facility labels |
| `admin.placeDetail.*` | Place approve / reject / restore |
| `admin.updateDetail.*` | Update-request review |
| `admin.reports.*` | Profile reports list + detail + suspension UI |
| `admin.actionLabels.*` | History labels keyed by moderation action IDs |
| `admin.broadcast.*` | SYSTEM/EVENT composer |
| `admin.errors.*` | Service / access keys |

Helpers: `src/utils/adminMessages.ts` (`localizeAdminMessage`, reason/status/action label getters, locale dates, `ADMIN_DELETE_USER_PHRASE`).

**Critical:** Role checks, RPC names, status/reason/action IDs, soft-delete, and notification delivery unchanged. Report reasons reuse `profile.report.reasons.*`.

---

## Final localization summary

| Metric | Value |
|--------|-------|
| Locales | `tr`, `en`, `es`, `de`, `ru` |
| Matching catalog keys | **1124** (after Admin + cleanup) |
| Frontend migration | **Complete** |

**Completed frontend areas:** infrastructure, language selector, shared/nav/errors, auth, onboarding, Explore, Map, Place Detail, Add/Edit Place, Collections/Saved, Profile, Settings, Notifications inbox, Admin Panel, Routes stub.

**Remaining limitations (by design):** native OS chrome; typed delete phrases; URLs/email/version; UGC and admin free text; historical stored notification English with client re-render; server push English; reverse-geocoded addresses; rare unmapped backend messages.

---

## Do-not-translate

- Route names, preference enums, URLs, email, version/build  
- UGC; brand Nice Place; technical logs  
- Typed delete confirmation phrases (`DELETE MY ACCOUNT`, `DELETE USER`)  
- Notification type IDs; report reason IDs; moderation action IDs; place statuses  
- Admin-authored SYSTEM/EVENT and moderation free text  

---

## Infrastructure

`src/i18n/`. Preference: `niceplace_language`. Check: `npm run i18n:check`.
