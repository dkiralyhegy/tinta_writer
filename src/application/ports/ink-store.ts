/**
 * Lateral de tinta: `<biblioteca>/.ink/<caminho relativo da nota>.json`.
 * A nota em si nunca recebe cor — ver domain/services/ink-runs.
 */
export interface InkStore {
  /** conteúdo bruto do lateral; null se não existe */
  load(root: string, notePath: string): Promise<string | null>;
  /** null apaga o lateral */
  save(root: string, notePath: string, content: string | null): Promise<void>;
  /** acompanha rename/move de nota OU pasta (chamar depois do rename da nota) */
  move(root: string, from: string, to: string): Promise<void>;
  /** move o lateral (nota ou pasta) para a Lixeira */
  trash(root: string, path: string): Promise<void>;
}
