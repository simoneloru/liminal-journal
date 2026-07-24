# Liminal Journal

A **minimal**, **mobile-first** Single Page Application for practicing [interstitial journaling](#philosophy): document the present (what you just did and the next tiny step), without planning the future.

**Product name:** Liminal Journal — the threshold between one moment and the next.  
**Method name:** interstitial journaling (unchanged; that’s the practice, not the brand).

Built for people with **ADHD** (and anyone who stalls on “big” tasks): no rituals, no dashboards, no gamification. One composer, a day log, data that stays on your device by default.

> **Status:** product decisions closed. Implementation (single `index.html`) is next.

**Language note:** product UI ships in **English and Italian** (toggle). This README and the code comments stay in **English**.

---

## Philosophy

Interstitial journaling is neither a to-do list nor a long reflective diary.

| Yes | No |
|-----|----|
| Log what you are doing **right now** | Plan the whole day |
| Micro-steps (“Opened the project folder”) | Vague ambitious goals |
| Automatic timestamps, zero friction | Multi-field forms, tags, priorities |
| Readable day log | Metrics, streaks, scores |
| Backups that feel human | Raw “JSON plumbing” in the main UI |
| Optional sync later | Forced accounts on day one |

**UX golden rule:** if a UI element does not help you write the next line in under ~3 seconds, it does not belong here.

---

## User & job-to-be-done

- **Who:** someone who freezes at task start or loses the thread after context switches.
- **When:** between activities, or when returning to the phone/desk after an interruption.
- **Job:** “I want a lightweight trace of where I am so I can resume without rebuilding everything from memory.”
- **Primary device:** **phone first**, then desktop. Touch targets, thumb reach, and safe areas matter more than dense desktop chrome.

---

## Closed product decisions

| # | Topic | Decision |
|---|--------|----------|
| 1 | Day navigation | **Default = today.** Browse other days via a **mobile-friendly day picker** (native date control + prev/next). Full month “calendar chrome” only if the native control is not enough — not a second product. |
| 2 | Edit / delete | **Full edit + delete** on entries (not append-only). |
| 3 | Composer | **Multi-line.** Enter inserts a newline. **Primary Save control** (sticky / easy thumb reach on mobile). Optional desktop shortcut: `Cmd/Ctrl+Enter` to save. |
| 4 | Backup / restore | **No “Export JSON” jargon in the UI.** Auto-save to `localStorage` (invisible). User-facing: **Download backup** / **Restore backup** (+ optional **Share day** as plain text on mobile). File format stays versioned JSON under the hood. Restore **merges by entry `id`**; if the user wants a clean slate, **Replace all** is a clear, confirmed choice in the restore flow. |
| 5 | UI language | **EN + IT toggle**, preference persisted. |
| 6 | License | **MIT** — you (and others) may use it commercially; simple and standard for GitHub. |
| 7 | Public name | **Liminal Journal** |
| 8 | Storage limits | **Soft warning only** when payload/entries get large; never block saving a new micro-step. |

### On “transparent cloud” (honest scope)

True **invisible multi-device sync** needs either:

- a backend + account, or  
- a third-party storage provider the user connects.

That fights “static site on GitHub Pages with zero friction” for v1. So:

| Layer | MVP | Later |
|-------|-----|--------|
| Auto local save | Yes (`localStorage`) | — |
| Human backup | Download / Restore / Share day | — |
| Transparent cloud | No | Optional sync (e.g. account-based product, or user-linked drive/gist) as a **separate** capability |

MVP remains useful offline and private; cloud is a product expansion, not a half-measure that adds login before the journal works.

---

## Features (MVP)

### Mobile-first shell
- Layout optimized for narrow viewports; comfortable tap targets (≥44px where practical).
- Composer and **Save** reachable with the thumb; log scrolls above/below without fighting the keyboard.
- Respect `safe-area-inset_*` on notched phones.

### Composer (quick input)
- Multi-line text area, **autofocus** when appropriate (desktop; on mobile, avoid aggressive focus that steals the session without a tap if it hurts UX — prefer focus after first interaction or on explicit “write” if keyboard jumps are painful).
- **Enter** = new line.
- **Save** button commits the entry (label localized).
- **Cmd/Ctrl+Enter** also saves (desktop nicety).
- Clear composer after successful save.

### Automatic timestamps
- On each save: current local time.
- **Log display:** `HH:mm — message` (multi-line body allowed; time on the first line / header of the card).
- **Internal storage:** ISO 8601 with offset for sorting and backups.

### Day log + day picker
- **Default view:** today (local calendar date).
- **Navigate days:** previous / next day controls + **date picker** (`<input type="date">` or equivalent) to jump to any day that has data (and empty days for writing “backfilled” notes if the user wants — same save path).
- Entries for the **selected day**, **newest first**.
- Empty state copy that nudges micro-steps.

### Micro-tasks (copy, not a validator)
- Placeholder / hint encourages tiny steps.
- Do **not** block “too short” or “too long” messages.

### Edit & delete
- Edit entry text in place (or a simple edit mode).
- Delete entry with a confirm that is hard to fat-finger but not multi-step bureaucracy (e.g. confirm once).
- Editing keeps original `id`; update `ts` only if we decide “edited time” matters — **default: keep original `ts`, optional `updatedAt`** for honesty in backups.

### Persistence
- Auto-save to **`localStorage`** on every create / edit / delete / restore / settings change.
- Versioned key, e.g. `liminal-journal:v1`.

### Backup, restore, share (user-friendly)
- **Download backup** — saves a file (JSON under the hood; filename like `liminal-journal-backup-YYYY-MM-DD.json`). UI copy avoids “JSON” unless the user opens advanced details.
- **Restore backup** — file picker → preview summary (counts / date range) → **Merge** (default, by `id`) or **Replace all** (confirm).
- **Share this day** — plain text via Web Share API when available; fallback to copy/download `.txt` for that day.
- Soft **storage warning** banner when size/count is high; saving still works.

### Theme & language
- Calm light / dark (`prefers-color-scheme` + toggle, persisted).
- Language: **English | Italiano**, persisted.

### Accessibility & keyboard
- Main flow usable with keyboard on desktop.
- Visible focus rings.
- Light `aria-live` when entries are added.

---

## Non-goals (MVP)

- Real-time multi-device cloud sync / accounts
- Analytics, tracking, cookie banners
- Tags, projects, folders, priorities, due dates
- Streaks, badges, productivity scores
- AI rewrite / classification
- Aggressive push notifications
- Backend, database, mandatory build step
- Custom full-month calendar widget (unless native date UI fails UX review)
- Showing raw “Import JSON / Export JSON” as primary labels

---

## Technical requirements

| Constraint | Choice |
|------------|--------|
| Hosting | **GitHub Pages** (static) |
| Artifact | **Single `index.html`** (CSS + JS inline; no build) |
| Framework | **Vanilla JS** |
| CSS | Modern native CSS, mobile-first (`:root` tokens, `color-scheme`) |
| Storage | `localStorage` key `liminal-journal:v1` |
| i18n | Small in-file dictionary (`en` / `it`) |
| License | **MIT** |

### Data model

```json
{
  "version": 1,
  "exportedAt": "2026-07-24T14:40:00+02:00",
  "entries": [
    {
      "id": "01JABCDEF...",
      "ts": "2026-07-24T14:32:05+02:00",
      "updatedAt": null,
      "text": "Opened the project folder"
    }
  ],
  "settings": {
    "theme": "system",
    "lang": "en"
  }
}
```

- `id`: stable (UUID) for merge/restore.
- `ts`: created-at (display time).
- `updatedAt`: set when text is edited; `null` if never edited.
- Settings may live in the same blob or a sibling key; backup should include them.

### Plain-text day share (proposal)

```text
Liminal Journal — 2026-07-24

14:32 — Opened the project folder
14:35 — Wrote the first line of the README
```

---

## UX copy (draft, EN)

| Element | English | Italian (draft) |
|---------|---------|------------------|
| App name | Liminal Journal | Liminal Journal |
| Subtitle | What are you doing right now? Keep the next step tiny. | Cosa stai facendo adesso? Il prossimo passo, piccolissimo. |
| Placeholder | e.g. Opened the project folder | es. Ho aperto la cartella del progetto |
| Save | Save | Salva |
| Empty day | No entries this day. Write a micro-step and tap Save. | Nessuna voce in questo giorno. Scrivi un micro-passo e tocca Salva. |
| Download backup | Download backup | Scarica backup |
| Restore backup | Restore backup | Ripristina backup |
| Share day | Share this day | Condividi questo giorno |
| Merge | Merge with existing | Unisci a quelli esistenti |
| Replace all | Replace everything | Sostituisci tutto |
| Soft storage warning | Backup recommended — storage is getting full. | Ti consiglio un backup — lo spazio si sta riempiendo. |

Avoid guilt copy and big “productivity scores.”

---

## Planned repository layout

```text
liminal-journal/          # git root (this folder)
├── index.html            # app (next)
├── README.md
├── LICENSE               # MIT
└── .gitignore
```

Parent folder `interstitial/` is only a workspace container — **not** a git repo. All commits and GitHub remotes attach here.


---

## Run locally (after implementation)

```bash
python3 -m http.server 8080
# http://localhost:8080
```

---

## Deploy on GitHub Pages

1. Push `main` with `index.html` at repo root.
2. **Settings → Pages →** branch `main` → `/ (root)`.
3. Open `https://<user>.github.io/<repo>/`.

### Post-deploy checklist
- [ ] Loads on a phone browser
- [ ] Save adds an entry with time on the selected day
- [ ] Day picker / prev-next changes the visible day
- [ ] Edit and delete work and persist after refresh
- [ ] Download backup + restore (merge and replace) work
- [ ] Share day works or falls back cleanly
- [ ] EN/IT toggle and light/dark persist
- [ ] Soft storage warning can appear without blocking Save

---

## Acceptance criteria (MVP)

1. Multi-line composer + **Save** creates an entry with `HH:mm` on the selected day (default today).
2. Can open another day via date control and/or prev/next.
3. Can edit and delete entries; changes survive refresh.
4. Download backup produces a restorable file; restore offers **merge** (default) and **replace**.
5. Share/copy day as plain text works on at least one mobile browser path.
6. UI language EN↔IT and theme preference persist.
7. Soft warning only under storage pressure; Save never hard-blocked.
8. Static GitHub Pages deploy with no build step.
9. No streaks, scores, or to-do lists in the UI.

---

## Roadmap (non-binding)

| Phase | Scope |
|-------|--------|
| **MVP** | Composer, day picker, edit/delete, localStorage, friendly backup/restore/share, EN/IT, theme, Pages |
| **v1.1** | Polish calendar UX if needed, search within day, undo snackbar |
| **v1.2** | Optional transparent-ish sync (product decision: account vs linked file provider) |
| **Never (unless we reverse)** | Gamification, social feed, AI coach |

---

## Inspiration & method

Liminal Journal is a small tool for **interstitial journaling**: *logging between activities* (what you are doing now and the next tiny step), not advance planning. The ADHD-friendly idea is to **lower start friction** and keep steps too small to trigger paralysis.

**Video that inspired this project:**

- [The BEST Productivity Method Ever for ADHD | Interstitial Journaling](https://www.youtube.com/watch?v=UFidZJhxz84) — [Novie by the Sea](https://www.youtube.com/@novie-bythesea)

This app is an independent implementation of the practice and is **not affiliated with** the video creator. The same credit appears in the app menu (⋯).

---

## Privacy

- No app server in MVP: data stays in **your browser**.
- Backups are files **you** download, share, or restore.
- No third-party analytics in the default deploy.

---

## License

[MIT](./LICENSE) — free to use, modify, distribute, and **commercialize** (your app or forks). You keep copyright; others can also use the code under MIT. If you later ship a hosted commercial product, MIT still allows that; you simply don’t have to open-source the hosting/backend pieces you add later.
