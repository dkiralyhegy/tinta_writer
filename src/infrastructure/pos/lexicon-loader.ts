import { BinaryPosLexicon } from "../../domain/services/pos-lexicon";

let loading: Promise<BinaryPosLexicon> | null = null;

/**
 * Carrega o léxico pt-BR (asset gzip fora do bundle JS) sob demanda —
 * só quando o realce de sintaxe liga pela primeira vez. Promise cacheada:
 * chamadas repetidas não refazem o fetch.
 *
 * Alguns servidores (o Vite dev, por ex.) servem .gz com
 * Content-Encoding: gzip e o fetch já entrega descomprimido; outros
 * (asset protocol do Tauri) entregam os bytes crus. Detectamos pelo
 * magic gzip (1f 8b) e descomprimimos apenas se preciso.
 */
export function loadPosLexicon(): Promise<BinaryPosLexicon> {
  loading ??= (async () => {
    const response = await fetch("/lexicon/pt-br.lex.gz");
    if (!response.ok) {
      throw new Error(`léxico indisponível: HTTP ${response.status}`);
    }
    let buffer = await response.arrayBuffer();

    const bytes = new Uint8Array(buffer);
    const isGzip = bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
    if (isGzip) {
      const stream = new Blob([buffer])
        .stream()
        .pipeThrough(new DecompressionStream("gzip"));
      buffer = await new Response(stream).arrayBuffer();
    }
    return BinaryPosLexicon.fromBuffer(buffer);
  })();
  loading.catch(() => (loading = null)); // falha não envenena o cache
  return loading;
}
