import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isValidEntry,
  parseBackup,
  buildBackup,
  serializeBackup,
  mergeEntries,
  replaceEntries,
  clearAllEntries,
  shouldShowBackupReminder,
  markBackupDone,
  backupFilename,
  preferNewerEntry,
  summarizeEntryRange,
} from "../journal-core.js";

function entry(id, text, ts = "2026-07-01T10:00:00+02:00", updatedAt = null) {
  return { id, text, ts, updatedAt };
}

describe("isValidEntry", () => {
  it("accepts minimal valid entries", () => {
    assert.equal(isValidEntry(entry("a", "hello")), true);
  });
  it("rejects missing fields", () => {
    assert.equal(isValidEntry({ id: "a", ts: "x" }), false);
    assert.equal(isValidEntry(null), false);
    assert.equal(isValidEntry({ id: "", ts: "t", text: "x" }), false);
  });
});

describe("parseBackup / serializeBackup", () => {
  it("round-trips a backup", () => {
    const built = buildBackup(
      {
        entries: [entry("1", "one"), entry("2", "two")],
        settings: { theme: "dark", lang: "it", lastBackupAt: null },
      },
      "2026-07-24T12:00:00+02:00"
    );
    const raw = serializeBackup(built);
    const parsed = parseBackup(raw);
    assert.equal(parsed.entries.length, 2);
    assert.equal(parsed.settings.lang, "it");
    assert.equal(parsed.version, 1);
  });

  it("throws on invalid JSON", () => {
    assert.throws(() => parseBackup("{nope"), /invalid_json/);
  });

  it("throws when entries missing", () => {
    assert.throws(() => parseBackup(JSON.stringify({ version: 1 })), /missing_entries/);
  });

  it("filters invalid entries but keeps valid ones", () => {
    const raw = JSON.stringify({
      version: 1,
      entries: [entry("ok", "yes"), { id: "bad" }, null, "x"],
    });
    const parsed = parseBackup(raw);
    assert.equal(parsed.entries.length, 1);
    assert.equal(parsed.entries[0].id, "ok");
  });

  it("allows empty entries array", () => {
    const parsed = parseBackup(JSON.stringify({ version: 1, entries: [] }));
    assert.equal(parsed.entries.length, 0);
  });
});

describe("mergeEntries — no duplicates", () => {
  it("adds only new ids into a full journal", () => {
    const existing = [
      entry("a", "already"),
      entry("b", "here"),
      entry("c", "full"),
    ];
    const incoming = [
      entry("b", "here"), // same
      entry("d", "new one"),
      entry("e", "another"),
    ];
    const r = mergeEntries(existing, incoming);
    assert.equal(r.entries.length, 5);
    assert.equal(r.added, 2);
    assert.equal(r.unchanged, 1);
    assert.equal(r.updated, 0);
    const ids = r.entries.map((e) => e.id).sort();
    assert.deepEqual(ids, ["a", "b", "c", "d", "e"]);
  });

  it("importing the same backup twice does not duplicate notes", () => {
    const base = [entry("a", "one"), entry("b", "two")];
    const backup = [entry("a", "one"), entry("b", "two"), entry("c", "three")];

    const first = mergeEntries(base, backup);
    assert.equal(first.entries.length, 3);
    assert.equal(first.added, 1);

    const second = mergeEntries(first.entries, backup);
    assert.equal(second.entries.length, 3, "second merge must not grow");
    assert.equal(second.added, 0);
    assert.equal(second.unchanged, 3);
    assert.equal(second.updated, 0);
  });

  it("same id with newer updatedAt updates text once", () => {
    const existing = [entry("a", "old", "2026-07-01T10:00:00+02:00", null)];
    const incoming = [
      entry("a", "new", "2026-07-01T10:00:00+02:00", "2026-07-02T12:00:00+02:00"),
    ];
    const r = mergeEntries(existing, incoming);
    assert.equal(r.entries.length, 1);
    assert.equal(r.updated, 1);
    assert.equal(r.entries[0].text, "new");
  });

  it("keeps existing when it is newer than incoming", () => {
    const existing = [
      entry("a", "local-newer", "2026-07-01T10:00:00+02:00", "2026-07-10T10:00:00+02:00"),
    ];
    const incoming = [
      entry("a", "backup-older", "2026-07-01T10:00:00+02:00", "2026-07-02T10:00:00+02:00"),
    ];
    const r = mergeEntries(existing, incoming);
    assert.equal(r.entries[0].text, "local-newer");
    // preferNewer returns existing; counts as unchanged if result equals prev
    assert.equal(r.entries.length, 1);
  });

  it("skips invalid rows in incoming", () => {
    const r = mergeEntries([], [entry("a", "ok"), { foo: 1 }, null]);
    assert.equal(r.added, 1);
    assert.equal(r.skippedInvalid, 2);
    assert.equal(r.entries.length, 1);
  });

  it("de-duplicates ids inside a single import payload (last/newer wins)", () => {
    const incoming = [
      entry("a", "first"),
      entry("a", "second", "2026-07-01T11:00:00+02:00", "2026-07-01T11:00:00+02:00"),
    ];
    const r = mergeEntries([], incoming);
    assert.equal(r.entries.length, 1);
    assert.equal(r.entries[0].text, "second");
  });
});

describe("replaceEntries", () => {
  it("replaces everything and de-dupes by id", () => {
    const r = replaceEntries([
      entry("a", "1"),
      entry("b", "2"),
      entry("a", "1b", "2026-07-02T10:00:00+02:00"),
    ]);
    assert.equal(r.kept, 2);
    const a = r.entries.find((e) => e.id === "a");
    assert.equal(a.text, "1b");
  });
});

describe("clearAllEntries", () => {
  it("wipes entries but can keep settings", () => {
    const state = {
      entries: [entry("a", "x")],
      settings: { theme: "dark", lang: "en", lastBackupAt: "2026-01-01T00:00:00Z" },
    };
    const wiped = clearAllEntries(state);
    assert.equal(wiped.entries.length, 0);
    assert.equal(wiped.settings.theme, "dark");
    assert.equal(wiped.settings.lastBackupAt, "2026-01-01T00:00:00Z");
  });
});

describe("backup reminder", () => {
  const day = 24 * 60 * 60 * 1000;
  const now = Date.parse("2026-07-24T12:00:00Z");

  it("does not remind with few entries", () => {
    assert.equal(shouldShowBackupReminder({}, 2, now), false);
  });

  it("reminds when enough entries and never backed up", () => {
    assert.equal(shouldShowBackupReminder({ lastBackupAt: null }, 10, now), true);
  });

  it("reminds when last backup is older than threshold", () => {
    const last = new Date(now - 10 * day).toISOString();
    assert.equal(shouldShowBackupReminder({ lastBackupAt: last }, 10, now), true);
  });

  it("does not remind when backup is recent", () => {
    const last = new Date(now - 2 * day).toISOString();
    assert.equal(shouldShowBackupReminder({ lastBackupAt: last }, 10, now), false);
  });

  it("markBackupDone sets lastBackupAt", () => {
    const s = markBackupDone({ theme: "system" }, "2026-07-24T12:00:00Z");
    assert.equal(s.lastBackupAt, "2026-07-24T12:00:00Z");
    assert.equal(s.theme, "system");
  });
});

describe("helpers", () => {
  it("backupFilename uses date", () => {
    assert.equal(backupFilename(new Date("2026-07-24T15:00:00")), "liminal-journal-backup-2026-07-24.json");
  });

  it("preferNewerEntry", () => {
    const older = entry("a", "o", "2026-07-01T10:00:00Z", "2026-07-01T10:00:00Z");
    const newer = entry("a", "n", "2026-07-01T10:00:00Z", "2026-07-05T10:00:00Z");
    assert.equal(preferNewerEntry(older, newer).text, "n");
  });

  it("summarizeEntryRange", () => {
    const dayKey = (ts) => ts.slice(0, 10);
    const s = summarizeEntryRange(
      [entry("a", "x", "2026-07-02T10:00:00Z"), entry("b", "y", "2026-07-01T10:00:00Z")],
      dayKey
    );
    assert.equal(s.count, 2);
    assert.equal(s.from, "2026-07-01");
    assert.equal(s.to, "2026-07-02");
  });
});

describe("complex import scenarios", () => {
  it("full journal + partial backup merge is stable under triple import", () => {
    let journal = [];
    for (let i = 0; i < 50; i++) {
      journal.push(entry("id-" + i, "note " + i, `2026-06-01T10:${String(i % 60).padStart(2, "0")}:00Z`));
    }
    const backup = [
      entry("id-0", "note 0"),
      entry("id-49", "note 49"),
      entry("id-new", "brand new"),
    ];

    for (let round = 0; round < 3; round++) {
      const r = mergeEntries(journal, backup);
      journal = r.entries;
      assert.equal(journal.length, 51);
    }
    assert.ok(journal.some((e) => e.id === "id-new"));
  });

  it("export then import into different full journal merges cleanly", () => {
    const deviceA = {
      entries: [entry("a1", "from A"), entry("shared", "A version", "2026-07-01T10:00:00Z", "2026-07-03T10:00:00Z")],
      settings: { lang: "en" },
    };
    const raw = serializeBackup(buildBackup(deviceA, "2026-07-24T12:00:00Z"));
    const parsed = parseBackup(raw);

    const deviceB = [
      entry("b1", "from B"),
      entry("shared", "B version", "2026-07-01T10:00:00Z", "2026-07-02T10:00:00Z"),
    ];
    const r = mergeEntries(deviceB, parsed.entries);
    assert.equal(r.entries.length, 3);
    const shared = r.entries.find((e) => e.id === "shared");
    assert.equal(shared.text, "A version", "newer A wins");
  });
});
