import type { WindowBlur } from "../../domain/entities/theme-config";

/** Aparência nativa da janela (desfoque atrás do conteúdo). */
export interface WindowAppearance {
  setBlur(level: WindowBlur): Promise<void>;
}
