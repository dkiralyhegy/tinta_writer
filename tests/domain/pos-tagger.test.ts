import { describe, expect, it } from "vitest";
import {
  POS_ADJ,
  POS_NOUN,
  POS_VERB,
  type PosLexicon,
} from "../../src/domain/services/pos-lexicon";
import { tagTokens, type EnabledCategories } from "../../src/domain/services/pos-tagger";

/** léxico fake injetado — o tagger é puro */
const fakeLexicon: PosLexicon = {
  maskOf(word: string): number {
    const table: Record<string, number> = {
      casa: POS_NOUN | POS_VERB, // "a casa" vs "ele casa"
      canto: POS_NOUN | POS_VERB, // "o canto" vs "eu canto"
      amarela: POS_ADJ | POS_VERB,
      porta: POS_NOUN | POS_VERB,
      mar: POS_NOUN,
      abriu: POS_VERB,
      escreveu: POS_VERB,
      bonita: POS_ADJ,
      livro: POS_NOUN,
    };
    return table[word] ?? 0;
  },
};

const ALL: EnabledCategories = { noun: true, verb: true, adj: true, adv: true, conj: true };

function tags(text: string, enabled: EnabledCategories = ALL) {
  return tagTokens(text, 0, fakeLexicon, enabled).map((t) => ({
    word: text.slice(t.from, t.to),
    cat: t.category,
  }));
}

describe("tagTokens", () => {
  it("advérbio por sufixo -mente", () => {
    expect(tags("caminhou lentamente")).toContainEqual({ word: "lentamente", cat: "adv" });
  });

  it("conjunções por lista fechada", () => {
    const result = tags("veio mas não ficou porque choveu");
    expect(result).toContainEqual({ word: "mas", cat: "conj" });
    expect(result).toContainEqual({ word: "porque", cat: "conj" });
    expect(result).toContainEqual({ word: "não", cat: "adv" });
  });

  it("desambiguação N/V: 'o canto' é substantivo, 'eu canto' é verbo", () => {
    expect(tags("o canto")).toEqual([{ word: "canto", cat: "noun" }]);
    expect(tags("eu canto")).toEqual([{ word: "canto", cat: "verb" }]);
  });

  it("desambiguação N/ADJ por posição: 'a casa amarela'", () => {
    const result = tags("a casa amarela");
    expect(result).toEqual([
      { word: "casa", cat: "noun" },
      { word: "amarela", cat: "adj" },
    ]);
  });

  it("'não' força leitura verbal do homógrafo", () => {
    expect(tags("não casa")).toContainEqual({ word: "casa", cat: "verb" });
  });

  it("palavra fora do léxico fica sem cor", () => {
    expect(tags("o zbrutx chegou")).not.toContainEqual(
      expect.objectContaining({ word: "zbrutx" }),
    );
  });

  it("nome próprio no meio da sentença fica sem cor", () => {
    const result = tags("ela viu Mar na praia");
    expect(result).not.toContainEqual(expect.objectContaining({ word: "Mar" }));
  });

  it("capitalizada em início de sentença é classificada normalmente", () => {
    // "Casa" após ponto final = início de sentença → consulta o léxico
    const result = tags("Fim. Casa velha");
    expect(result).toContainEqual({ word: "Casa", cat: "noun" });
  });

  it("filtro de categorias: só advérbios", () => {
    const onlyAdv: EnabledCategories = { noun: false, verb: false, adj: false, adv: true, conj: false };
    const result = tags("o livro chegou rapidamente", onlyAdv);
    expect(result).toEqual([{ word: "rapidamente", cat: "adv" }]);
  });

  it("baseOffset desloca posições", () => {
    const tokens = tagTokens("o mar", 500, fakeLexicon, ALL);
    expect(tokens[0]!.from).toBe(502);
  });
});
