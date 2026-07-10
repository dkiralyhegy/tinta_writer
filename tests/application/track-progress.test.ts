import { describe, expect, it } from "vitest";
import type { Clock } from "../../src/application/ports/clock";
import type { StatsStore } from "../../src/application/ports/stats-store";
import type { StatsLog } from "../../src/domain/entities/writing-stats";
import { ProgressTracker } from "../../src/application/use-cases/track-progress";

class InMemoryStatsStore implements StatsStore {
  saved: StatsLog | null = null;
  constructor(private initial: unknown = null) {}
  async load(): Promise<unknown | null> {
    return this.initial;
  }
  async save(log: StatsLog): Promise<void> {
    this.saved = structuredClone(log);
  }
}

const clockAt = (date: Date): Clock => ({ now: () => date });

describe("ProgressTracker", () => {
  it("acumula deltas e persiste no flush", async () => {
    const store = new InMemoryStatsStore();
    const tracker = new ProgressTracker(store, clockAt(new Date(2026, 6, 10, 10, 0)));
    await tracker.init();

    tracker.recordDelta("/w/cap1.md", 100);
    tracker.recordDelta("/w/cap1.md", -20);
    expect(tracker.wordsToday()).toBe(80);

    await tracker.flush();
    expect(store.saved?.["2026-07-10"]?.wordsWritten).toBe(80);
  });

  it("continua de um log existente em disco", async () => {
    const store = new InMemoryStatsStore({
      "2026-07-10": { wordsWritten: 300, byNote: { "/w/cap1.md": 300 } },
    });
    const tracker = new ProgressTracker(store, clockAt(new Date(2026, 6, 10, 15, 0)));
    await tracker.init();

    tracker.recordDelta("/w/cap1.md", 50);
    expect(tracker.wordsToday()).toBe(350);
    expect(tracker.dailyProgress(500).ratio).toBe(0.7);
  });

  it("flush sem mudanças não regrava", async () => {
    const store = new InMemoryStatsStore();
    const tracker = new ProgressTracker(store, clockAt(new Date(2026, 6, 10)));
    await tracker.init();
    await tracker.flush();
    expect(store.saved).toBeNull();
  });
});
