import { describe, expect, it } from "vitest";
import { countWords, wordDelta } from "../../src/domain/services/word-count";

describe("countWords", () => {
  it("conta palavras separadas por whitespace", () => {
    expect(countWords("ela abriu a porta")).toBe(4);
  });

  it("texto vazio e só espaços", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("  \n\t ")).toBe(0);
  });

  it("acentuação e cedilha contam como letras", () => {
    expect(countWords("coração à deriva, então")).toBe(4);
  });

  it("pontuação solta não conta", () => {
    expect(countWords("sim — não ... ?!")).toBe(2);
  });

  it("números contam", () => {
    expect(countWords("capítulo 12")).toBe(2);
  });

  it("quebras de linha múltiplas", () => {
    expect(countWords("um\n\ndois\n\n\ntrês")).toBe(3);
  });

  it("marcadores markdown sem letras não contam como palavra", () => {
    expect(countWords("## Capítulo Um")).toBe(2);
    expect(countWords("- item da lista")).toBe(3);
  });
});

describe("wordDelta", () => {
  it("delta positivo ao completar palavra", () => {
    expect(wordDelta("casa", "casa nova")).toBe(1);
  });

  it("delta zero digitando dentro de uma palavra", () => {
    expect(wordDelta("cas", "casa")).toBe(0);
  });

  it("delta negativo ao apagar", () => {
    expect(wordDelta("uma frase inteira", "uma")).toBe(-2);
  });
});
