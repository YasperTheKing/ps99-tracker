import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fetchTitanicPetNames, fetchTitanicCounts } from "./ps99Api.js";

const DATA_DIR = path.resolve("data");
const SNAPSHOT_FILE = path.join(DATA_DIR, "snapshots.json");
const MAX_HISTORY_MINUTES = 180; // keep 3 hours of snapshots on disk/memory

export class TitanicTracker {
  constructor() {
    this.titanicNames = new Set();
    /** @type {{timestamp: number, total: number, perPet: Record<string, number>}[]} */
    this.history = [];
  }

  async init() {
    await mkdir(DATA_DIR, { recursive: true });
    this.titanicNames = await fetchTitanicPetNames();
    await this._loadHistory();
  }

  async _loadHistory() {
    try {
      const raw = await readFile(SNAPSHOT_FILE, "utf-8");
      this.history = JSON.parse(raw);
      this._prune();
    } catch {
      this.history = []; // no file yet, or corrupt — start fresh
    }
  }

  async _saveHistory() {
    await writeFile(SNAPSHOT_FILE, JSON.stringify(this.history), "utf-8");
  }

  _prune() {
    const cutoff = Date.now() - MAX_HISTORY_MINUTES * 60_000;
    this.history = this.history.filter((s) => s.timestamp >= cutoff);
  }

  /** Poll the API once, record a snapshot, and persist it. */
  async poll() {
    // Re-check the Titanic pet list occasionally in case new ones are added
    // in a game update — cheap enough to just refresh every poll.
    this.titanicNames = await fetchTitanicPetNames();
    const snapshot = await fetchTitanicCounts(this.titanicNames);
    this.history.push(snapshot);
    this._prune();
    await this._saveHistory();
    return snapshot;
  }

  /**
   * Estimate the current global Titanic hatch rate over the given window.
   * Uses the oldest snapshot within the window and the newest snapshot to
   * compute a delta, then scales it to a per-hour rate. Negative deltas
   * (counts can dip slightly from trades/deletions) are clamped to 0.
   */
  getRate(windowMinutes = 60) {
    if (this.history.length < 2) return null;

    const latest = this.history[this.history.length - 1];
    const cutoff = latest.timestamp - windowMinutes * 60_000;
    const oldest = this.history.find((s) => s.timestamp >= cutoff) ?? this.history[0];

    const elapsedMs = latest.timestamp - oldest.timestamp;
    if (elapsedMs <= 0) return null;

    const elapsedHours = elapsedMs / 3_600_000;
    const totalDelta = Math.max(0, latest.total - oldest.total);
    const perHour = totalDelta / elapsedHours;

    const perPetRate = {};
    for (const name of this.titanicNames) {
      const oldCount = oldest.perPet[name] ?? 0;
      const newCount = latest.perPet[name] ?? 0;
      const delta = Math.max(0, newCount - oldCount);
      if (delta > 0) perPetRate[name] = delta / elapsedHours;
    }

    return {
      perHour,
      perPetRate,
      windowMinutesActual: elapsedMs / 60_000,
      latestTotal: latest.total,
      latestTimestamp: latest.timestamp,
    };
  }
}
