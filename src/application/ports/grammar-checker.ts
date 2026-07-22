/** Problema gramatical num trecho de texto (posições relativas ao trecho). */
export interface GrammarIssue {
  from: number;
  to: number;
  message: string;
  replacements: string[];
}

/** Porta de checagem gramatical — implementada por infra (LanguageTool). */
export interface GrammarChecker {
  check(text: string): Promise<GrammarIssue[]>;
}
