import { describe, expect, it } from "vitest";
import type { StatsLog } from "../../src/domain/entities/writing-stats";
import {
  applyDelta,
  dailyProgress,
  normalizeStatsLog,
  wordsToday,
} from "../../src/domain/services/stats-calculator";

describe("applyDelta / wordsToday", () => {
  it("acumula saldos por dia e por nota", () => {
    const log: StatsLog = {};
    applyDelta(log, "2026-07-10", "/w/cap1.md", 120);
    applyDelta(log, "2026-07-10", "/w/cap1.md", 30);
    applyDelta(log, "2026-07-10", "/w/daily.md", 50);
    expect(wordsToday(log, "2026-07-10")).toBe(200);
    expect(log["2026-07-10"]!.byNote["/w/cap1.md"]).toBe(150);
  });

  it("saldo negativo não mostra contagem negativa no dia", () => {
    const log: StatsLog = {};
    applyDelta(log, "2026-07-10", "/w/cap1.md", -80);
    expect(wordsToday(log, "2026-07-10")).toBe(0);
    // mas o dado cru preserva o saldo real
    expect(log["2026-07-10"]!.wordsWritten).toBe(-80);
  });

  it("delta zero não cria entrada", () => {
    const log: StatsLog = {};
    applyDelta(log, "2026-07-10", "/w/cap1.md", 0);
    expect(log["2026-07-10"]).toBeUndefined();
  });
});

describe("dailyProgress", () => {
  it("calcula razão saturada em 1", () => {
    const log: StatsLog = { "2026-07-10": { wordsWritten: 900, byNote: {} } };
    const p = dailyProgress(log, "2026-07-10", 500);
    expect(p.ratio).toBe(1);
    expect(p.done).toBe(true);
    expect(p.current).toBe(900);
  });

  it("progresso parcial", () => {
    const log: StatsLog = { "2026-07-10": { wordsWritten: 250, byNote: {} } };
    const p = dailyProgress(log, "2026-07-10", 500);
    expect(p.ratio).toBe(0.5);
    expect(p.done).toBe(false);
  });
});

describe("normalizeStatsLog", () => {
  it("descarta lixo e mantém entradas válidas", () => {
    const raw = {
      "2026-07-10": { wordsWritten: 100, byNote: { "/a.md": 100 } },
      "não-é-data": { wordsWritten: 5 },
      "2026-07-11": { wordsWritten: "NaN", byNote: null },
    };
    const log = normalizeStatsLog(raw);
    expect(Object.keys(log)).toEqual(["2026-07-10", "2026-07-11"]);
    expect(log["2026-07-11"]!.wordsWritten).toBe(0);
  });

  it("null/undefined viram log vazio", () => {
    expect(normalizeStatsLog(null)).toEqual({});
    expect(normalizeStatsLog(undefined)).toEqual({});
  });
});
