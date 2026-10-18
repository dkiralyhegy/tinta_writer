import { describe, expect, it } from "vitest";
import { BELL_COLUMN, carriageEvents } from "../../src/domain/services/carriage";

const at = (line: number, col: number) => ({ line, col });

describe("carriageEvents", () => {
  it("letra na mesma linha = tecla", () => {
    expect(
      carriageEvents({ action: "insert", text: "a", prev: at(0, 3), next: at(0, 4), bellRung: false }),
    ).toEqual({ events: ["key"], bellRung: false });
  });

  it("espaço tem som próprio", () => {
    expect(
      carriageEvents({ action: "insert", text: " ", prev: at(0, 3), next: at(0, 4), bellRung: false })
        .events,
    ).toEqual(["space"]);
  });

  it("Enter = retorno do carro + avanço de linha, sem tecla", () => {
    expect(
      carriageEvents({ action: "insert", text: "\n", prev: at(0, 20), next: at(28, 0), bellRung: true }),
    ).toEqual({ events: ["return", "linefeed"], bellRung: false });
  });

  it("quebra automática = tecla + retorno + avanço", () => {
    expect(
      carriageEvents({ action: "insert", text: "x", prev: at(0, 65), next: at(28, 1), bellRung: true })
        .events,
    ).toEqual(["key", "return", "linefeed"]);
  });

  it("ding uma vez por linha ao cruzar a coluna do sino", () => {
    const first = carriageEvents({
      action: "insert",
      text: "a",
      prev: at(0, BELL_COLUMN - 1),
      next: at(0, BELL_COLUMN),
      bellRung: false,
    });
    expect(first).toEqual({ events: ["key", "bell"], bellRung: true });
    const second = carriageEvents({
      action: "insert",
      text: "a",
      prev: at(0, BELL_COLUMN),
      next: at(0, BELL_COLUMN + 1),
      bellRung: true,
    });
    expect(second.events).toEqual(["key"]);
  });

  it("backspace = recuo", () => {
    expect(
      carriageEvents({ action: "delete", text: "", prev: at(0, 5), next: at(0, 4), bellRung: true }),
    ).toEqual({ events: ["backspace"], bellRung: true });
  });

  it("mover o cursor não faz som; mudar de linha rearma o sino", () => {
    expect(
      carriageEvents({ action: "move", text: "", prev: at(0, 60), next: at(56, 2), bellRung: true }),
    ).toEqual({ events: [], bellRung: false });
    expect(
      carriageEvents({ action: "move", text: "", prev: at(0, 60), next: at(0, 2), bellRung: true }),
    ).toEqual({ events: [], bellRung: true });
  });

  it("colar várias letras = uma tecla", () => {
    expect(
      carriageEvents({ action: "insert", text: "abc", prev: at(0, 1), next: at(0, 4), bellRung: false })
        .events,
    ).toEqual(["key"]);
  });
});
