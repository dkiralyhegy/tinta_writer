export interface PageLayout {
  /** índices das linhas que abrem uma folha nova */
  breakBefore: number[];
  /** altura de conteúdo usada por folha (pode passar da folha num parágrafo gigante) */
  pageHeights: number[];
}

/**
 * Paginação "manter linhas juntas": cada linha do documento (um parágrafo,
 * no markdown) é indivisível. A que não cabe no resto da folha vai inteira
 * para a próxima; uma maior que a folha inteira estica a sua folha.
 */
export function computePageBreaks(
  lineHeights: readonly number[],
  pageContentHeight: number,
): PageLayout {
  const breakBefore: number[] = [];
  const pageHeights: number[] = [];
  let used = 0;
  lineHeights.forEach((h, i) => {
    if (used > 0 && used + h > pageContentHeight) {
      pageHeights.push(used);
      breakBefore.push(i);
      used = 0;
    }
    used += h;
  });
  pageHeights.push(used);
  return { breakBefore, pageHeights };
}
