import { describe, expect, it } from "vitest";
import { formatReadingTime } from "../../src/domain/services/reading-time";

describe("formatReadingTime", () => {
  it("textos curtos: menos de 1 min", () => {
    expect(formatReadingTime(0)).toBe("menos de 1 min");
    expect(formatReadingTime(80)).toBe("menos de 1 min");
  });

  it("minutos redondos", () => {
    expect(formatReadingTime(200)).toBe("~1 min");
    expect(formatReadingTime(1400)).toBe("~7 min");
  });

  it("livro inteiro: horas com minutos zero-padded", () => {
    expect(formatReadingTime(200_000)).toBe("~16h40");
    expect(formatReadingTime(12_000)).toBe("~1h");
    expect(formatReadingTime(13_000)).toBe("~1h05");
  });

  it("wpm customizado", () => {
    expect(formatReadingTime(300, 100)).toBe("~3 min");
  });
});
