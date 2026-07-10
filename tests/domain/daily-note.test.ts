import { describe, expect, it } from "vitest";
import {
  dailyNotePath,
  dailyNoteTemplate,
  localDateKey,
} from "../../src/domain/services/daily-note";

describe("localDateKey", () => {
  it("usa a data local, não UTC", () => {
    // 23:30 local de 9 de julho — em UTC (BRT+3) já seria dia 10
    const lateNight = new Date(2026, 6, 9, 23, 30);
    expect(localDateKey(lateNight)).toBe("2026-07-09");
  });

  it("zera à esquerda mês e dia", () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("dailyNotePath", () => {
  it("monta <root>/daily/YYYY-MM-DD.md", () => {
    const d = new Date(2026, 6, 10, 9, 0);
    expect(dailyNotePath("/Users/x/Writing", d)).toBe("/Users/x/Writing/daily/2026-07-10.md");
  });
});

describe("dailyNoteTemplate", () => {
  it("gera heading com data por extenso em pt-BR", () => {
    const d = new Date(2026, 6, 10);
    const tpl = dailyNoteTemplate(d);
    expect(tpl).toMatch(/^# /);
    expect(tpl).toContain("julho");
    expect(tpl).toContain("2026");
    expect(tpl.endsWith("\n\n")).toBe(true);
  });
});
