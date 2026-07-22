import type { GrammarChecker, GrammarIssue } from "../../application/ports/grammar-checker";

const LOCAL_ENDPOINT = "http://127.0.0.1:8081/v2";
const PUBLIC_ENDPOINT = "https://api.languagetool.org/v2";

/** limites da API pública gratuita */
const MAX_CHARS = 19_000;
const MIN_INTERVAL_MS = 4_000;

interface LtMatch {
  offset: number;
  length: number;
  message: string;
  shortMessage?: string;
  replacements?: { value: string }[];
}

/**
 * Adapter do LanguageTool. Prefere um servidor local (privacidade total)
 * se houver um rodando em 127.0.0.1:8081; senão usa a API pública —
 * ONLINE, o texto sai da máquina; o toggle nos ajustes avisa isso.
 */
export class LanguageToolChecker implements GrammarChecker {
  private endpoint: Promise<string> | null = null;
  private lastRequestAt = 0;

  private resolveEndpoint(): Promise<string> {
    this.endpoint ??= (async () => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 800);
        const res = await fetch(`${LOCAL_ENDPOINT}/languages`, { signal: ctrl.signal });
        clearTimeout(timer);
        if (res.ok) return LOCAL_ENDPOINT;
      } catch {
        // sem servidor local — segue para a API pública
      }
      return PUBLIC_ENDPOINT;
    })();
    return this.endpoint;
  }

  async check(text: string): Promise<GrammarIssue[]> {
    const endpoint = await this.resolveEndpoint();
    const clipped = text.slice(0, MAX_CHARS);

    // rate limit só na API pública (20 req/min)
    if (endpoint === PUBLIC_ENDPOINT) {
      const wait = this.lastRequestAt + MIN_INTERVAL_MS - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      this.lastRequestAt = Date.now();
    }

    const body = new URLSearchParams({
      language: "pt-BR",
      text: clipped,
      level: "default",
    });
    const res = await fetch(`${endpoint}/check`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) throw new Error(`LanguageTool: HTTP ${res.status}`);

    const data = (await res.json()) as { matches?: LtMatch[] };
    return (data.matches ?? [])
      .filter((m) => m.offset + m.length <= clipped.length)
      .map((m) => ({
        from: m.offset,
        to: m.offset + m.length,
        message: m.shortMessage || m.message,
        replacements: (m.replacements ?? []).slice(0, 4).map((r) => r.value),
      }));
  }
}
