import type { GrammarChecker } from "../../application/ports/grammar-checker";
import type { CmEditor } from "../codemirror/editor";

/**
 * Ciclo de vida da checagem gramatical: debounce após digitação, descarta
 * resultados obsoletos (o doc mudou durante a requisição) e limpa tudo
 * ao ser descartada. Erros de rede são silenciosos — o recurso é opcional.
 */
export class GrammarSession {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  constructor(
    private readonly editor: CmEditor,
    private readonly checker: GrammarChecker,
    private readonly delayMs = 2000,
  ) {}

  /** chamar a cada alteração de conteúdo */
  noteChanged(): void {
    this.schedule(this.delayMs);
  }

  /** primeira checagem logo após ligar/abrir nota */
  checkSoon(): void {
    this.schedule(400);
  }

  private schedule(ms: number): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.run();
    }, ms);
  }

  private async run(): Promise<void> {
    if (this.disposed) return;
    const window = this.editor.visibleWindow();
    const docBefore = this.editor.docIdentity();

    let issues;
    try {
      issues = await this.checker.check(window.text);
    } catch {
      return; // rede/limite — tenta de novo no próximo ciclo
    }
    if (this.disposed || this.editor.docIdentity() !== docBefore) return;

    this.editor.setGrammarIssues(
      issues.map((issue) => ({
        ...issue,
        from: window.from + issue.from,
        to: window.from + issue.to,
      })),
    );
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    this.editor.clearGrammarIssues();
  }
}
