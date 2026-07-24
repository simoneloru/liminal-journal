# Liminal Journal

**[Open the app →](https://simoneloru.github.io/liminal-journal/)**

A minimal web app for **interstitial journaling**: write what you’re doing *right now* and the next tiny step. Not a to-do list. Not a productivity dashboard. No streaks, no AI, no account.

Built for ADHD brains (and anyone who freezes at “big tasks”). Mobile-first. Data stays in **your browser**.

### Watch (inspiration)

- [The BEST Productivity Method Ever for ADHD | Interstitial Journaling](https://www.youtube.com/watch?v=UFidZJhxz84) — **Novie by the Sea** (how this project got started)
- Optional follow-up: [A Practical Walkthrough](https://www.youtube.com/watch?v=FUr4hQ8ibxk) (same creator)

Independent tool — not affiliated with the video creator.

---

## Why

Most “productivity” tools want a plan. Interstitial journaling only asks:

> What am I doing? What’s the next micro-step?

Timestamps are automatic. Friction is the enemy. If a control doesn’t help you write the next line in a few seconds, it shouldn’t be on the screen.

**On paper the whole method is:** write the time → what you’re doing → when you switch, write the next thing → repeat when your brain drifts. (Optionally: how you feel.)

---

## Features

- Single-line composer (**Enter** saves); expand for focus mode (full page, log hidden)
- Day log in chronological order; full-month calendar; prev/next day
- Edit / delete entries
- Hide the writer to read; **+** brings it back
- Auto-save to `localStorage`
- **Safety copy**: share or download a file (iPhone → Files / iCloud / Drive); restore with **merge by id** (no duplicates) or replace
- Soft reminder if you haven’t made a copy in a while
- EN / IT, light / dark
- Wipe notebook only by typing `DELETE` / `ELIMINA`
- Help in the menu

**No server. No signup.** Clearing site data wipes the journal unless you saved a safety copy.

---

## Stack

Static SPA on **GitHub Pages**:

| File | Role |
|------|------|
| `index.html` | UI + app logic |
| `journal-core.js` | Pure import / export / merge (testable) |
| `tests/` | Node unit tests |

No build step. No framework.

```bash
# local
python3 -m http.server 8080
# http://localhost:8080

npm test   # import/export/merge edge cases
```

---

## Privacy (by design)

Notes never leave your device unless **you** share or download a copy. There is no Liminal backend and no analytics in the default deploy.

That keeps the project free to host and free of user-data admin — at the cost of **no automatic multi-device sync**. That’s intentional for now.

---

## License

[MIT](./LICENSE)
