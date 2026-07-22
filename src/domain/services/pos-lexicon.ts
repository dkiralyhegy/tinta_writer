/** Bitmask de classes gramaticais — mesma codificação do build script. */
export const POS_NOUN = 1;
export const POS_VERB = 2;
export const POS_ADJ = 4;
export const POS_ADV = 8;

export interface PosLexicon {
  /** bitmask de classes possíveis da forma (0 = fora do léxico) */
  maskOf(word: string): number;
}

/**
 * Léxico imutável sobre o buffer do artefato TLEX1: uma string única com
 * as formas ordenadas + índice de offsets + máscaras. Busca binária com
 * o comparador padrão de string JS (o MESMO usado no sort do build) e
 * memoização — em prosa, a taxa de reuso de palavras torna o lookup O(1)
 * amortizado.
 */
export class BinaryPosLexicon implements PosLexicon {
  private readonly memo = new Map<string, number>();

  private constructor(
    private readonly forms: string,
    private readonly offsets: Uint32Array, // início de cada forma; último = fim do bloco
    private readonly masks: Uint8Array,
  ) {}

  /** Parse do artefato bruto (já des-gzipado). */
  static fromBuffer(buffer: ArrayBuffer): BinaryPosLexicon {
    const bytes = new Uint8Array(buffer);
    const magic = new TextDecoder("ascii").decode(bytes.subarray(0, 5));
    if (magic !== "TLEX1") throw new Error(`léxico inválido: magic "${magic}"`);
    const view = new DataView(buffer);
    const count = view.getUint32(5, true);
    const formsByteLen = view.getUint32(9, true);

    const formsBytes = bytes.subarray(13, 13 + formsByteLen);
    const masks = bytes.slice(13 + formsByteLen, 13 + formsByteLen + count);
    const forms = new TextDecoder("utf-8").decode(formsBytes);

    // offsets: posição (em unidades UTF-16 da string) de cada forma
    const offsets = new Uint32Array(count + 1);
    let idx = 0;
    offsets[idx++] = 0;
    for (let i = 0; i < forms.length && idx <= count; i++) {
      if (forms.charCodeAt(i) === 10 /* \n */) offsets[idx++] = i + 1;
    }
    offsets[count] = forms.length + 1; // sentinela (compensa o \n ausente no fim)
    if (idx !== count) throw new Error(`léxico corrompido: ${idx} formas, esperado ${count}`);

    return new BinaryPosLexicon(forms, offsets, masks);
  }

  private formAt(i: number): string {
    return this.forms.substring(this.offsets[i]!, this.offsets[i + 1]! - 1);
  }

  maskOf(word: string): number {
    const cached = this.memo.get(word);
    if (cached !== undefined) return cached;

    let lo = 0;
    let hi = this.masks.length - 1;
    let result = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const form = this.formAt(mid);
      if (form === word) {
        result = this.masks[mid]!;
        break;
      }
      if (form < word) lo = mid + 1;
      else hi = mid - 1;
    }
    // memo com teto para não crescer sem limite em docs enormes
    if (this.memo.size < 50_000) this.memo.set(word, result);
    return result;
  }
}
