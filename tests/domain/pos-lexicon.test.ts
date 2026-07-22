import { describe, expect, it } from "vitest";
import {
  BinaryPosLexicon,
  POS_ADJ,
  POS_NOUN,
  POS_VERB,
} from "../../src/domain/services/pos-lexicon";

/** monta um buffer TLEX1 exatamente como o build script (sort padrão JS) */
function buildBuffer(entries: Record<string, number>): ArrayBuffer {
  const forms = Object.keys(entries).sort();
  const formsBytes = new TextEncoder().encode(forms.join("\n"));
  const buf = new Uint8Array(13 + formsBytes.length + forms.length);
  buf.set(new TextEncoder().encode("TLEX1"), 0);
  const view = new DataView(buf.buffer);
  view.setUint32(5, forms.length, true);
  view.setUint32(9, formsBytes.length, true);
  buf.set(formsBytes, 13);
  forms.forEach((f, i) => {
    buf[13 + formsBytes.length + i] = entries[f]!;
  });
  return buf.buffer;
}

describe("BinaryPosLexicon", () => {
  const lexicon = BinaryPosLexicon.fromBuffer(
    buildBuffer({
      casa: POS_NOUN | POS_VERB,
      árvore: POS_NOUN,
      escrever: POS_VERB,
      bonito: POS_ADJ,
      zumbido: POS_NOUN,
    }),
  );

  it("encontra formas com a máscara correta", () => {
    expect(lexicon.maskOf("casa")).toBe(POS_NOUN | POS_VERB);
    expect(lexicon.maskOf("bonito")).toBe(POS_ADJ);
  });

  it("acentuadas ordenam e buscam consistentemente (sort JS = busca JS)", () => {
    expect(lexicon.maskOf("árvore")).toBe(POS_NOUN);
  });

  it("primeira e última forma da ordenação", () => {
    expect(lexicon.maskOf("escrever")).toBe(POS_VERB);
    expect(lexicon.maskOf("zumbido")).toBe(POS_NOUN);
  });

  it("fora do léxico retorna 0", () => {
    expect(lexicon.maskOf("xyzabc")).toBe(0);
  });

  it("memoização devolve o mesmo resultado", () => {
    expect(lexicon.maskOf("casa")).toBe(lexicon.maskOf("casa"));
  });

  it("magic inválido lança erro", () => {
    const bad = new Uint8Array(20);
    expect(() => BinaryPosLexicon.fromBuffer(bad.buffer)).toThrow(/magic/);
  });
});
