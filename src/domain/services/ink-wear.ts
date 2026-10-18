/**
 * Imperfeições da tinta por caractere. Determinístico a partir da letra e
 * dos 3 caracteres anteriores: digitar adiante nunca altera letras já
 * batidas, e nada treme a cada repaint.
 */
export interface WearStyle {
  /** 0.78–1 no desgaste máximo */
  opacity: number;
  /** deslocamento vertical em px (±0.6) */
  dy: number;
  /** rotação em graus (±1.2) */
  rot: number;
  /** raio do sangramento em px */
  bleed: number;
  /** batida fraca: metade de baixo mais clara */
  faint: boolean;
}

function hash32(code: number, context: string): number {
  let h = 0x811c9dc5 ^ code;
  for (let i = 0; i < context.length; i++) {
    h = Math.imul(h ^ context.charCodeAt(i), 0x01000193);
  }
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return (h ^ (h >>> 15)) >>> 0;
}

export function wearFor(code: number, context: string, wear: number): WearStyle | null {
  if (wear <= 0) return null;
  const h = hash32(code, context);
  const r = (shift: number) => ((h >>> shift) & 0xff) / 255;
  return {
    opacity: 1 - 0.22 * wear * r(0),
    dy: (r(8) - 0.5) * 1.2 * wear,
    rot: (r(16) - 0.5) * 2.4 * wear,
    bleed: 0.4 * wear,
    faint: r(24) < 0.1 * wear,
  };
}
