/**
 * Contagem de palavras por tokenização em whitespace, contando apenas tokens
 * com ao menos uma letra ou dígito ("—" e "..." soltos não contam).
 * O(n) e sem alocação por segmento — rápido o bastante para documentos de
 * livro (~1,2 MB), diferente de Intl.Segmenter, que custa dezenas de ms.
 */
const WORD_CHAR = /[\p{L}\p{N}]/u;

export function countWords(text: string): number {
  let count = 0;
  let inToken = false;
  let tokenHasWordChar = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    const isSpace = ch === " " || ch === "\n" || ch === "\t" || ch === "\r";
    if (isSpace) {
      if (inToken && tokenHasWordChar) count++;
      inToken = false;
      tokenHasWordChar = false;
    } else {
      inToken = true;
      if (!tokenHasWordChar && WORD_CHAR.test(ch)) tokenHasWordChar = true;
    }
  }
  if (inToken && tokenHasWordChar) count++;
  return count;
}

export function countChars(text: string): number {
  return text.length;
}

/**
 * Delta de palavras entre dois trechos que cobrem a mesma região editada,
 * ambos expandidos até fronteiras de whitespace (responsabilidade do caller).
 * Permite computar o saldo por transação sem recontar o documento inteiro.
 */
export function wordDelta(oldSlice: string, newSlice: string): number {
  return countWords(newSlice) - countWords(oldSlice);
}
