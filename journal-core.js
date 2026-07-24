/**
 * Pure journal backup / merge helpers (no DOM).
 * Used by the app and by Node unit tests.
 */

export const STORAGE_KEY = "liminal-journal:v1";
export const BACKUP_FORMAT_VERSION = 1;

/** Soft reminder: after this many entries without a safety copy */
export const REMINDER_MIN_ENTRIES = 5;
/** Soft reminder: days since last safety copy */
export const REMINDER_DAYS = 7;

/**
 * @typedef {{ id: string, ts: string, updatedAt?: string|null, text: string }} JournalEntry
 * @typedef {{ theme?: string, lang?: string, lastBackupAt?: string|null }} JournalSettings
 * @typedef {{ version: number, exportedAt?: string, entries: JournalEntry[], settings?: JournalSettings }} BackupPayload
 */

/**
 * @param {unknown} e
 * @returns {e is JournalEntry}
 */
export function isValidEntry(e) {
  return (
    !!e &&
    typeof e === "object" &&
    typeof e.id === "string" &&
    e.id.length > 0 &&
    typeof e.ts === "string" &&
    e.ts.length > 0 &&
    typeof e.text === "string"
  );
}

/**
 * Normalize a single entry (drops unknown junk, keeps fields we care about).
 * @param {JournalEntry} e
 * @returns {JournalEntry}
 */
export function normalizeEntry(e) {
  return {
    id: e.id,
    ts: e.ts,
    updatedAt: e.updatedAt == null || e.updatedAt === "" ? null : String(e.updatedAt),
    text: e.text,
  };
}

/**
 * Parse backup JSON text. Throws on hard failures.
 * @param {string} raw
 * @returns {BackupPayload}
 */
export function parseBackup(raw) {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("empty_backup");
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("invalid_json");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("invalid_shape");
  }
  const entriesIn = Array.isArray(data.entries) ? data.entries : null;
  if (!entriesIn) {
    throw new Error("missing_entries");
  }
  const entries = entriesIn.filter(isValidEntry).map(normalizeEntry);
  return {
    version: typeof data.version === "number" ? data.version : BACKUP_FORMAT_VERSION,
    exportedAt: typeof data.exportedAt === "string" ? data.exportedAt : undefined,
    entries,
    settings:
      data.settings && typeof data.settings === "object" && !Array.isArray(data.settings)
        ? data.settings
        : undefined,
  };
}

/**
 * Build a serializable backup object.
 * @param {{ entries: JournalEntry[], settings?: JournalSettings }} state
 * @param {string} exportedAt ISO timestamp
 * @returns {BackupPayload}
 */
export function buildBackup(state, exportedAt) {
  return {
    version: BACKUP_FORMAT_VERSION,
    exportedAt,
    entries: (state.entries || []).filter(isValidEntry).map(normalizeEntry),
    settings: state.settings ? { ...state.settings } : undefined,
  };
}

/**
 * @param {BackupPayload} backup
 * @returns {string}
 */
export function serializeBackup(backup) {
  return JSON.stringify(backup, null, 2);
}

/**
 * @param {string|Date} date
 * @returns {string} liminal-journal-backup-YYYY-MM-DD.json
 */
export function backupFilename(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `liminal-journal-backup-${y}-${m}-${day}.json`;
}

/**
 * Prefer the "newer" of two entries for the same id.
 * Uses updatedAt if set, else ts.
 * @param {JournalEntry} a
 * @param {JournalEntry} b
 * @returns {JournalEntry}
 */
export function preferNewerEntry(a, b) {
  const ta = Date.parse(a.updatedAt || a.ts);
  const tb = Date.parse(b.updatedAt || b.ts);
  if (Number.isNaN(ta) && Number.isNaN(tb)) return b;
  if (Number.isNaN(ta)) return b;
  if (Number.isNaN(tb)) return a;
  return tb >= ta ? b : a;
}

/**
 * Merge by id — never duplicates.
 * Same id twice in the same import: last occurrence wins after preferNewer with existing.
 *
 * @param {JournalEntry[]} existing
 * @param {JournalEntry[]} incoming
 * @returns {{
 *   entries: JournalEntry[],
 *   added: number,
 *   updated: number,
 *   unchanged: number,
 *   skippedInvalid: number
 * }}
 */
export function mergeEntries(existing, incoming) {
  const map = new Map();
  for (const e of existing) {
    if (isValidEntry(e)) map.set(e.id, normalizeEntry(e));
  }

  let added = 0;
  let updated = 0;
  let unchanged = 0;
  let skippedInvalid = 0;

  for (const raw of incoming) {
    if (!isValidEntry(raw)) {
      skippedInvalid += 1;
      continue;
    }
    const e = normalizeEntry(raw);
    const prev = map.get(e.id);
    if (!prev) {
      map.set(e.id, e);
      added += 1;
      continue;
    }
    const next = preferNewerEntry(prev, e);
    const same =
      prev.text === next.text &&
      prev.ts === next.ts &&
      (prev.updatedAt || null) === (next.updatedAt || null);
    if (same) {
      unchanged += 1;
    } else {
      map.set(e.id, next);
      updated += 1;
    }
  }

  return {
    entries: Array.from(map.values()),
    added,
    updated,
    unchanged,
    skippedInvalid,
  };
}

/**
 * Replace entire entry list with validated incoming entries.
 * @param {JournalEntry[]} incoming
 * @returns {{ entries: JournalEntry[], kept: number, skippedInvalid: number }}
 */
export function replaceEntries(incoming) {
  let skippedInvalid = 0;
  const entries = [];
  const seen = new Set();
  for (const raw of incoming) {
    if (!isValidEntry(raw)) {
      skippedInvalid += 1;
      continue;
    }
    const e = normalizeEntry(raw);
    // de-dupe within the backup itself by id (last wins)
    if (seen.has(e.id)) {
      const idx = entries.findIndex((x) => x.id === e.id);
      if (idx >= 0) entries[idx] = e;
      continue;
    }
    seen.add(e.id);
    entries.push(e);
  }
  return { entries, kept: entries.length, skippedInvalid };
}

/**
 * Wipe notebook entries; settings preserved unless caller clears them.
 * @param {{ entries: JournalEntry[], settings?: JournalSettings }} state
 */
export function clearAllEntries(state) {
  return {
    ...state,
    entries: [],
  };
}

/**
 * @param {{ lastBackupAt?: string|null }} settings
 * @param {number} entryCount
 * @param {number} [nowMs]
 * @param {{ minEntries?: number, days?: number }} [opts]
 */
export function shouldShowBackupReminder(settings, entryCount, nowMs = Date.now(), opts = {}) {
  const minEntries = opts.minEntries ?? REMINDER_MIN_ENTRIES;
  const days = opts.days ?? REMINDER_DAYS;
  if (entryCount < minEntries) return false;
  const last = settings && settings.lastBackupAt;
  if (!last) return true;
  const t = Date.parse(last);
  if (Number.isNaN(t)) return true;
  const elapsed = nowMs - t;
  return elapsed >= days * 24 * 60 * 60 * 1000;
}

/**
 * @param {JournalSettings} settings
 * @param {string} isoNow
 * @returns {JournalSettings}
 */
export function markBackupDone(settings, isoNow) {
  return {
    ...(settings || {}),
    lastBackupAt: isoNow,
  };
}

/**
 * Summarize date range of entries (local calendar keys if ts parses).
 * @param {JournalEntry[]} entries
 * @param {(iso: string) => string} dayKeyFn maps ts → YYYY-MM-DD
 */
export function summarizeEntryRange(entries, dayKeyFn) {
  const days = [];
  for (const e of entries) {
    if (!isValidEntry(e)) continue;
    try {
      const k = dayKeyFn(e.ts);
      if (k) days.push(k);
    } catch {
      /* skip */
    }
  }
  days.sort();
  return {
    count: entries.filter(isValidEntry).length,
    from: days[0] || null,
    to: days.length ? days[days.length - 1] : null,
  };
}
