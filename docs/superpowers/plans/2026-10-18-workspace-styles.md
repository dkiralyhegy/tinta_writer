# Estilos de workspace (⌘E) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar ao tinta o eixo "estilo do workspace" (⌘E: padrão → typewriter real → transparência → papel), com tinta colorida por trecho guardada fora da nota.

**Architecture:** Tudo sobre o CodeMirror 6 existente: cada estilo é CSS por `data-style` no `<html>` + uma extensão do CM num `Compartment` próprio. Regras puras (ciclo de estilos, trechos de tinta, quebra de página, eventos do carro, desgaste da tinta) ficam em `src/domain` com testes Vitest. Cores de tinta vivem num lateral `<biblioteca>/.ink/<rel>.json` via porta `InkStore` + commands Rust; transparência via porta `WindowAppearance` sobre `setEffects` do Tauri; sons via Web Audio atrás de uma porta.

**Tech Stack:** Tauri v2 (Rust), Svelte 5 (runes), CodeMirror 6 (`@codemirror/view` 6.43), TypeScript 5.6 strict (`noUncheckedIndexedAccess`), Vitest 3.

**Spec:** `docs/superpowers/specs/2026-10-18-workspace-styles-design.md`

## Global Constraints

- **Nenhuma nota `.md`/`.txt` recebe byte algum além do texto digitado.** Cores só no lateral `.ink/`.
- Estilo padrão `standard` = app idêntico ao atual (opt-in total).
- Ciclo do ⌘E: `standard → typewriter-real → transparent → paper → standard`.
- Defaults: `workspaceStyle "standard"`, `windowOpacity 0.75` (0.15–1), `windowBlur "light"`, `ink "black"`, `typewriterSound true`, `typewriterVolume 0.6` (0–1), `inkWear 0.5` (0–1).
- Tintas: preto `#1d1c1a`, azul `#1f3a93`, vermelho `#a3231f`; fora do typewriter real no dark: azul `#7f9be0`, vermelho `#e0675f`.
- Typewriter real: Courier Prime (SIL OFL), coluna 65ch, linha de batida a 65% da altura, ding na coluna 59, retorno 280 ms, escape 40 ms, papel sempre claro `#f6f1e7`.
- Papel: mesa `#d9d2c8` (claro) / `#1a1a1b` (escuro); folha branca / `#2a2a2b`; vão 32 px; A4 1:√2; margem = 11,9% da largura da folha.
- Copy da UI em português, minúsculas, como o app atual (HUD: `estilo: papel`, `tinta: azul`…).
- Camadas: `domain` sem imports externos; `application` só portas; `infrastructure` implementa; só `src/main.ts` conhece tudo.
- Testes rodam sem Tauri e sem DOM. Exceção explícita: `tests/infrastructure/ink-field.test.ts` usa só `@codemirror/state` (puro JS, sem DOM).
- Todo commit termina com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Verificação de cada task: `npm test` verde e `npm run check` com 0 erros (5 warnings pré-existentes são aceitos).

## Ajustes da spec decididos neste plano

Registrados aqui e propagados para a spec no Task 1:

1. **Herança de cor ao digitar fora do typewriter real**: lá não há tinta ativa escolhível, então texto inserido *dentro* ou *no fim* de um trecho colorido herda a cor (como estender uma palavra). No typewriter real, texto inserido sempre recebe a tinta ativa (preta corta o trecho).
2. **Desgaste da tinta estável**: o hash por caractere usa `(caractere, 3 caracteres anteriores)` em vez da posição no documento — digitar adiante nunca altera letras já batidas; uma edição só altera as 3 letras seguintes.
3. **Gravação do lateral**: grava quando a serialização mudou (inclui o hash do conteúdo); notas sem cor nunca geram I/O de tinta.
4. **Sons em `.m4a` (AAC)**: o WKWebView não decodifica Ogg Vorbis de forma confiável.
5. **Opacidade da janela**: aplicada via duas CSS vars em porcentagem (`--tinta-window-alpha`, `--tinta-chrome-alpha`) calculadas em JS.

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/domain/entities/theme-config.ts` (mod) | campos novos, `WORKSPACE_STYLES`, `INKS`, `WINDOW_BLURS`, `nextWorkspaceStyle`, `nextInk` |
| `src/domain/services/ink-runs.ts` | trechos de tinta: normalizar, recolorir, serializar, reancorar |
| `src/domain/services/page-breaks.ts` | quebras de página "manter linhas juntas" |
| `src/domain/services/carriage.ts` | eventos do carro (tecla, espaço, retorno, ding, avanço, recuo) |
| `src/domain/services/ink-wear.ts` | desgaste determinístico por caractere |
| `src/application/ports/window-appearance.ts` | porta do desfoque nativo |
| `src/application/ports/ink-store.ts` | porta do lateral de tinta |
| `src/application/ports/typewriter-sounds.ts` | porta dos sons |
| `src/application/use-cases/ink-persistence.ts` | `loadInk` / `saveInk` |
| `src/infrastructure/tauri/tauri-window-appearance.ts` | `setEffects`/`clearEffects` |
| `src/infrastructure/tauri/tauri-ink-store.ts` | invoke dos commands de tinta |
| `src/infrastructure/audio/typewriter-sounds.ts` | Web Audio + buffers |
| `src/infrastructure/codemirror/ink-field.ts` | `StateField` de trechos (só `@codemirror/state`) |
| `src/infrastructure/codemirror/ink.ts` | decorações de cor + reexport do field |
| `src/infrastructure/codemirror/paper-pages.ts` | espaçadores + layer de folhas |
| `src/infrastructure/codemirror/real-typewriter.ts` | carro, batida, desgaste, tranco |
| `src/infrastructure/codemirror/editor.ts` (mod) | compartments novos, API de tinta |
| `src/infrastructure/codemirror/ia-writer-theme.ts` (mod) | fonte/coluna do typewriter real, classes de token |
| `src-tauri/src/commands/ink.rs` | read/write/move/trash do lateral |
| `src/ui/stores/workspace.svelte.ts` (mod) | ciclo de estilo, chrome derivado, tinta, sons, ciclo de vida do lateral |
| `src/ui/App.svelte` (mod) | ⌘E, ⌘⇧I, chrome derivado, fita/controles |
| `src/ui/SettingsPanel.svelte` (mod) | seção "estilo do workspace" |
| `src/ui/StatusBar.svelte` (mod) | "página N de M", atalhos novos |
| `src/ui/InkRibbon.svelte` | indicador de fita |
| `src/ui/TypewriterControls.svelte` | painel mínimo do ⌘, no typewriter real |
| `src/ui/styles/style-transparent.css` / `style-paper.css` / `style-typewriter-real.css` | CSS de cada estilo |
| `tests/fakes/in-memory-ink-store.ts` | fake da porta |

---

## Fase A — Fundação

### Task 1: Campos do tema, ciclo de estilos e de tinta

**Files:**
- Modify: `src/domain/entities/theme-config.ts`
- Modify: `tests/domain/theme-config.test.ts`
- Modify: `docs/superpowers/specs/2026-10-18-workspace-styles-design.md` (ajustes 1–5 acima)

**Interfaces:**
- Produces:
  - `WORKSPACE_STYLES = ["standard","typewriter-real","transparent","paper"] as const`, `type WorkspaceStyle`
  - `INKS = ["black","blue","red"] as const`, `type Ink`
  - `WINDOW_BLURS = ["off","light","strong"] as const`, `type WindowBlur`
  - `ThemeConfig` + `workspaceStyle: WorkspaceStyle; windowOpacity: number; windowBlur: WindowBlur; ink: Ink; typewriterSound: boolean; typewriterVolume: number; inkWear: number`
  - `nextWorkspaceStyle(current: WorkspaceStyle): WorkspaceStyle`, `nextInk(current: Ink): Ink`

- [ ] **Step 1: Escrever os testes que falham** — acrescentar ao fim de `tests/domain/theme-config.test.ts` (e trocar o import da linha 2):

```ts
import {
  DEFAULT_THEME,
  nextInk,
  nextWorkspaceStyle,
  normalizeTheme,
} from "../../src/domain/entities/theme-config";
```

```ts
describe("campos de estilo do workspace", () => {
  it("defaults dos campos novos", () => {
    const t = normalizeTheme(null);
    expect(t.workspaceStyle).toBe("standard");
    expect(t.windowOpacity).toBe(0.75);
    expect(t.windowBlur).toBe("light");
    expect(t.ink).toBe("black");
    expect(t.typewriterSound).toBe(true);
    expect(t.typewriterVolume).toBe(0.6);
    expect(t.inkWear).toBe(0.5);
  });

  it("enums inválidos caem no default", () => {
    const t = normalizeTheme({ workspaceStyle: "neon", windowBlur: "total", ink: "verde" });
    expect(t.workspaceStyle).toBe("standard");
    expect(t.windowBlur).toBe("light");
    expect(t.ink).toBe("black");
  });

  it("aceita valores válidos", () => {
    const t = normalizeTheme({ workspaceStyle: "paper", windowBlur: "off", ink: "red" });
    expect(t.workspaceStyle).toBe("paper");
    expect(t.windowBlur).toBe("off");
    expect(t.ink).toBe("red");
  });

  it("clampa números e preserva zero onde zero é válido", () => {
    const t = normalizeTheme({ windowOpacity: 0, typewriterVolume: 0, inkWear: 7 });
    expect(t.windowOpacity).toBe(0.15);
    expect(t.typewriterVolume).toBe(0);
    expect(t.inkWear).toBe(1);
  });

  it("número inválido cai no default", () => {
    const t = normalizeTheme({ windowOpacity: "muito", typewriterVolume: null });
    expect(t.windowOpacity).toBe(0.75);
    expect(t.typewriterVolume).toBe(0.6);
  });
});

describe("nextWorkspaceStyle", () => {
  it("cicla padrão → typewriter real → transparência → papel → padrão", () => {
    expect(nextWorkspaceStyle("standard")).toBe("typewriter-real");
    expect(nextWorkspaceStyle("typewriter-real")).toBe("transparent");
    expect(nextWorkspaceStyle("transparent")).toBe("paper");
    expect(nextWorkspaceStyle("paper")).toBe("standard");
  });
});

describe("nextInk", () => {
  it("cicla preto → azul → vermelho → preto", () => {
    expect(nextInk("black")).toBe("blue");
    expect(nextInk("blue")).toBe("red");
    expect(nextInk("red")).toBe("black");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/domain/theme-config.test.ts`
Expected: FAIL — `nextInk is not a function` / campos `undefined`.

- [ ] **Step 3: Implementar** em `src/domain/entities/theme-config.ts`:

Logo abaixo de `export type Accent = …`:

```ts
export const WORKSPACE_STYLES = ["standard", "typewriter-real", "transparent", "paper"] as const;
export type WorkspaceStyle = (typeof WORKSPACE_STYLES)[number];

/** tinta da máquina de escrever — preto é a ausência de cor no lateral */
export const INKS = ["black", "blue", "red"] as const;
export type Ink = (typeof INKS)[number];

/** desfoque nativo (vibrancy) atrás da janela no estilo transparência */
export const WINDOW_BLURS = ["off", "light", "strong"] as const;
export type WindowBlur = (typeof WINDOW_BLURS)[number];

const cycle = <T>(list: readonly T[], current: T): T =>
  list[(list.indexOf(current) + 1) % list.length]!;

/** ordem do ⌘E */
export function nextWorkspaceStyle(current: WorkspaceStyle): WorkspaceStyle {
  return cycle(WORKSPACE_STYLES, current);
}

/** ordem do ⌘⇧I */
export function nextInk(current: Ink): Ink {
  return cycle(INKS, current);
}
```

No fim da interface `ThemeConfig` (depois de `grammarCheck: boolean;`):

```ts
  /** aparência do workspace, alternada com ⌘E */
  workspaceStyle: WorkspaceStyle;
  /** opacidade do fundo no estilo transparência (0.15–1); o texto fica sempre opaco */
  windowOpacity: number;
  windowBlur: WindowBlur;
  /** tinta ativa no typewriter real */
  ink: Ink;
  typewriterSound: boolean;
  /** 0–1 */
  typewriterVolume: number;
  /** intensidade das imperfeições da tinta, 0 (limpa) a 1 (máquina velha) */
  inkWear: number;
```

No fim de `DEFAULT_THEME` (depois de `grammarCheck: false,`):

```ts
  workspaceStyle: "standard",
  windowOpacity: 0.75,
  windowBlur: "light",
  ink: "black",
  typewriterSound: true,
  typewriterVolume: 0.6,
  inkWear: 0.5,
```

Em `normalizeTheme`, depois de `const bool = …`:

```ts
  // diferente do padrão `Number(x) || default`: aqui zero é valor legítimo
  const num = (value: unknown, fallback: number, lo: number, hi: number): number =>
    typeof value === "number" && Number.isFinite(value) ? clamp(value, lo, hi) : fallback;
```

E no objeto retornado, depois de `grammarCheck: …`:

```ts
    workspaceStyle: pick(r.workspaceStyle, WORKSPACE_STYLES, DEFAULT_THEME.workspaceStyle),
    windowOpacity: num(r.windowOpacity, DEFAULT_THEME.windowOpacity, 0.15, 1),
    windowBlur: pick(r.windowBlur, WINDOW_BLURS, DEFAULT_THEME.windowBlur),
    ink: pick(r.ink, INKS, DEFAULT_THEME.ink),
    typewriterSound: bool(r.typewriterSound, DEFAULT_THEME.typewriterSound),
    typewriterVolume: num(r.typewriterVolume, DEFAULT_THEME.typewriterVolume, 0, 1),
    inkWear: num(r.inkWear, DEFAULT_THEME.inkWear, 0, 1),
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/domain/theme-config.test.ts`
Expected: PASS (todos, incluindo os 4 antigos).

- [ ] **Step 5: Propagar os ajustes 1–5 para a spec.** Em `docs/superpowers/specs/2026-10-18-workspace-styles-design.md`:
  - Em "Regras" da tinta, trocar a linha "Copiar/colar leva só o texto (sem cor); colar dentro de um trecho colorido herda a cor dele, como digitar." por: "Copiar/colar leva só o texto (sem cor). Fora do typewriter real, texto inserido dentro ou no fim de um trecho colorido herda a cor dele; no typewriter real, texto inserido sempre recebe a tinta ativa (preta corta o trecho)."
  - Em "Desgaste da tinta", trocar "`hash(posição no doc, caractere)`" por "`hash(caractere, 3 caracteres anteriores)` — digitar adiante nunca altera letras já batidas".
  - Em "Persistência", trocar "só quando os trechos mudaram desde a última gravação" por "só quando a serialização (trechos + hash do conteúdo) mudou desde a última gravação; notas sem cor nunca geram I/O de tinta".
  - Na tabela de sons, trocar `.ogg` por `.m4a` e em "Arquitetura" `public/sounds/*.ogg` por `public/sounds/*.m4a`.
  - Em "DOM", trocar "a opacidade em `--tinta-window-opacity`" por "a opacidade em `--tinta-window-alpha` / `--tinta-chrome-alpha` (porcentagens)".

- [ ] **Step 6: Suite + check + commit**

Run: `npm test && npm run check`
Expected: tudo verde, 0 erros.

```bash
git add src/domain/entities/theme-config.ts tests/domain/theme-config.test.ts docs/superpowers/specs/2026-10-18-workspace-styles-design.md
git commit -m "feat(domain): campos de estilo do workspace, ciclos de estilo e tinta

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Serviço de trechos de tinta (`ink-runs`)

**Files:**
- Create: `src/domain/services/ink-runs.ts`
- Test: `tests/domain/ink-runs.test.ts`

**Interfaces:**
- Consumes: `type Ink` de `theme-config.ts` (Task 1).
- Produces:
  ```ts
  export type ColoredInk = Exclude<Ink, "black">;
  export interface InkRun { from: number; to: number; ink: ColoredInk }
  export interface StoredRun extends InkRun { text: string; prefix: string; suffix: string }
  export interface StoredInk { version: 1; contentLength: number; contentHash: string; runs: StoredRun[] }
  export function contentHash(doc: string): string
  export function normalizeRuns(runs: readonly InkRun[]): InkRun[]
  export function recolor(runs: readonly InkRun[], from: number, to: number, ink: Ink): InkRun[]
  export function serializeRuns(doc: string, runs: readonly InkRun[]): StoredInk | null
  export function parseStoredInk(text: string): StoredInk | null
  export function resolveRuns(doc: string, stored: StoredInk | null): InkRun[]
  ```

- [ ] **Step 1: Escrever os testes que falham** — `tests/domain/ink-runs.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  contentHash,
  normalizeRuns,
  parseStoredInk,
  recolor,
  resolveRuns,
  serializeRuns,
  type InkRun,
} from "../../src/domain/services/ink-runs";

const blue = (from: number, to: number): InkRun => ({ from, to, ink: "blue" });
const red = (from: number, to: number): InkRun => ({ from, to, ink: "red" });

describe("normalizeRuns", () => {
  it("ordena, funde adjacentes de mesma cor e descarta vazios", () => {
    expect(normalizeRuns([blue(5, 8), blue(0, 5), red(9, 9)])).toEqual([blue(0, 8)]);
  });

  it("adjacentes de cores diferentes ficam separados", () => {
    expect(normalizeRuns([blue(0, 3), red(3, 6)])).toEqual([blue(0, 3), red(3, 6)]);
  });
});

describe("recolor", () => {
  it("colore um trecho preto", () => {
    expect(recolor([], 2, 6, "blue")).toEqual([blue(2, 6)]);
  });

  it("preto remove a cor", () => {
    expect(recolor([blue(0, 10)], 0, 10, "black")).toEqual([]);
  });

  it("parcial no meio divide o trecho", () => {
    expect(recolor([blue(0, 10)], 3, 6, "red")).toEqual([blue(0, 3), red(3, 6), blue(6, 10)]);
  });

  it("cruzando dois trechos", () => {
    expect(recolor([blue(0, 5), red(5, 10)], 3, 7, "black")).toEqual([blue(0, 3), red(7, 10)]);
  });

  it("mesma cor encostada funde", () => {
    expect(recolor([blue(0, 5)], 5, 8, "blue")).toEqual([blue(0, 8)]);
  });

  it("range vazio não muda nada", () => {
    expect(recolor([blue(0, 5)], 3, 3, "red")).toEqual([blue(0, 5)]);
  });
});

describe("contentHash", () => {
  it("determinístico e sensível a mudança", () => {
    expect(contentHash("abc")).toBe(contentHash("abc"));
    expect(contentHash("abc")).not.toBe(contentHash("abd"));
    expect(contentHash("abc")).toMatch(/^fnv1a:[0-9a-f]{8}$/);
  });
});

describe("serializeRuns / resolveRuns", () => {
  const doc = "Era uma vez uma máquina de escrever azul.";

  it("zero trechos → null (sem lateral)", () => {
    expect(serializeRuns(doc, [])).toBeNull();
  });

  it("guarda âncora: texto, prefixo e sufixo", () => {
    const stored = serializeRuns(doc, [blue(12, 23)])!;
    expect(stored.runs[0]).toMatchObject({ text: "uma máquina", ink: "blue" });
    expect(stored.runs[0]!.prefix).toBe("Era uma vez ");
    expect(stored.runs[0]!.suffix).toBe(" de escrever azul.");
    expect(stored.contentLength).toBe(doc.length);
  });

  it("round-trip pelo caminho rápido (texto inalterado)", () => {
    const runs = [blue(0, 3), red(12, 23)];
    expect(resolveRuns(doc, serializeRuns(doc, runs))).toEqual(runs);
  });

  it("reancora quando texto foi inserido antes do trecho", () => {
    const stored = serializeRuns(doc, [red(12, 23)])!;
    const edited = `Prólogo. ${doc}`; // +9 caracteres
    expect(resolveRuns(edited, stored)).toEqual([red(21, 32)]);
  });

  it("ocorrências repetidas: desempata pelo contexto", () => {
    const text = "azul aqui. e azul ali.";
    const stored = serializeRuns(text, [blue(13, 17)])!; // o segundo "azul"
    const edited = `x ${text}`;
    expect(resolveRuns(edited, stored)).toEqual([blue(15, 19)]);
  });

  it("trecho apagado por fora é descartado, o resto sobrevive", () => {
    const stored = serializeRuns(doc, [blue(0, 3), red(12, 23)])!;
    const edited = doc.replace("uma máquina", "um piano");
    expect(resolveRuns(edited, stored)).toEqual([blue(0, 3)]);
  });

  it("null e versão desconhecida → sem trechos", () => {
    expect(resolveRuns(doc, null)).toEqual([]);
    expect(resolveRuns(doc, { version: 2 } as never)).toEqual([]);
  });
});

describe("parseStoredInk", () => {
  it("lê o que serializeRuns gerou", () => {
    const stored = serializeRuns("abc def", [blue(0, 3)])!;
    expect(parseStoredInk(JSON.stringify(stored))).toEqual(stored);
  });

  it("JSON inválido ou formato estranho → null", () => {
    expect(parseStoredInk("{nope")).toBeNull();
    expect(parseStoredInk('{"version":1}')).toBeNull();
    expect(parseStoredInk('{"version":9,"runs":[]}')).toBeNull();
  });

  it("descarta trechos malformados mas mantém os válidos", () => {
    const text = JSON.stringify({
      version: 1,
      contentLength: 3,
      contentHash: "fnv1a:00000000",
      runs: [
        { from: 0, to: 3, ink: "blue", text: "abc", prefix: "", suffix: "" },
        { from: 0, to: 3, ink: "verde", text: "abc", prefix: "", suffix: "" },
      ],
    });
    expect(parseStoredInk(text)!.runs).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/domain/ink-runs.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar** `src/domain/services/ink-runs.ts`:

```ts
import type { Ink } from "../entities/theme-config";

/**
 * Trechos de tinta colorida. A nota nunca guarda cor: os trechos vivem num
 * arquivo lateral e são reancorados pelo próprio texto (estilo Web
 * Annotation TextQuoteSelector) quando a nota foi editada fora do tinta.
 * Preto é a ausência de trecho.
 */
export type ColoredInk = Exclude<Ink, "black">;

export interface InkRun {
  from: number;
  to: number;
  ink: ColoredInk;
}

export interface StoredRun extends InkRun {
  text: string;
  prefix: string;
  suffix: string;
}

export interface StoredInk {
  version: 1;
  contentLength: number;
  contentHash: string;
  runs: StoredRun[];
}

/** caracteres de contexto guardados de cada lado da âncora */
const CONTEXT = 32;

/** FNV-1a 32 bits — barato e suficiente para "o texto mudou?" */
export function contentHash(doc: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < doc.length; i++) {
    h ^= doc.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `fnv1a:${(h >>> 0).toString(16).padStart(8, "0")}`;
}

/** ordena, funde adjacentes/sobrepostos de mesma cor, descarta vazios */
export function normalizeRuns(runs: readonly InkRun[]): InkRun[] {
  const sorted = runs
    .filter((r) => r.to > r.from)
    .map((r) => ({ from: r.from, to: r.to, ink: r.ink }))
    .sort((a, b) => a.from - b.from || a.to - b.to);
  const out: InkRun[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r.from <= last.to) {
      if (last.ink === r.ink) {
        last.to = Math.max(last.to, r.to);
        continue;
      }
      // sobreposição de cores diferentes: o anterior fica, o resto do novo segue
      if (r.to > last.to) out.push({ ...r, from: last.to });
      continue;
    }
    out.push(r);
  }
  return out;
}

/** pinta [from, to) com a tinta dada; preto apaga a cor do intervalo */
export function recolor(runs: readonly InkRun[], from: number, to: number, ink: Ink): InkRun[] {
  if (to <= from) return normalizeRuns(runs);
  const out: InkRun[] = [];
  for (const r of runs) {
    if (r.to <= from || r.from >= to) {
      out.push({ ...r });
      continue;
    }
    if (r.from < from) out.push({ ...r, to: from });
    if (r.to > to) out.push({ ...r, from: to });
  }
  if (ink !== "black") out.push({ from, to, ink });
  return normalizeRuns(out);
}

/** formato do lateral; null = nota sem cor (o lateral deve ser apagado) */
export function serializeRuns(doc: string, runs: readonly InkRun[]): StoredInk | null {
  const clean = normalizeRuns(runs).filter((r) => r.from >= 0 && r.to <= doc.length);
  if (clean.length === 0) return null;
  return {
    version: 1,
    contentLength: doc.length,
    contentHash: contentHash(doc),
    runs: clean.map((r) => ({
      ...r,
      text: doc.slice(r.from, r.to),
      prefix: doc.slice(Math.max(0, r.from - CONTEXT), r.from),
      suffix: doc.slice(r.to, r.to + CONTEXT),
    })),
  };
}

function isStoredRun(value: unknown): value is StoredRun {
  const r = value as Partial<StoredRun> | null;
  return (
    !!r &&
    (r.ink === "blue" || r.ink === "red") &&
    Number.isInteger(r.from) &&
    Number.isInteger(r.to) &&
    r.to! > r.from! &&
    typeof r.text === "string" &&
    r.text.length > 0 &&
    typeof r.prefix === "string" &&
    typeof r.suffix === "string"
  );
}

/** lê o JSON do lateral; null se ilegível ou de versão desconhecida */
export function parseStoredInk(text: string): StoredInk | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const r = raw as Partial<StoredInk> | null;
  if (!r || r.version !== 1 || !Array.isArray(r.runs)) return null;
  if (typeof r.contentLength !== "number" || typeof r.contentHash !== "string") return null;
  return {
    version: 1,
    contentLength: r.contentLength,
    contentHash: r.contentHash,
    runs: r.runs.filter(isStoredRun),
  };
}

function commonSuffixLength(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
  return n;
}

function commonPrefixLength(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
}

/** melhor ocorrência de r.text: maior contexto casado, depois a mais próxima de r.from */
function bestMatch(doc: string, r: StoredRun): number | null {
  let best: number | null = null;
  let bestScore = -1;
  let bestDistance = Infinity;
  for (let i = doc.indexOf(r.text); i !== -1; i = doc.indexOf(r.text, i + 1)) {
    const before = doc.slice(Math.max(0, i - r.prefix.length), i);
    const after = doc.slice(i + r.text.length, i + r.text.length + r.suffix.length);
    const score = commonSuffixLength(before, r.prefix) + commonPrefixLength(after, r.suffix);
    const distance = Math.abs(i - r.from);
    if (score > bestScore || (score === bestScore && distance < bestDistance)) {
      best = i;
      bestScore = score;
      bestDistance = distance;
    }
  }
  return best;
}

/** trechos válidos para o texto atual; o que não for reencontrado é descartado */
export function resolveRuns(doc: string, stored: StoredInk | null): InkRun[] {
  if (!stored || stored.version !== 1 || !Array.isArray(stored.runs)) return [];
  const runs = stored.runs.filter(isStoredRun);
  if (stored.contentLength === doc.length && stored.contentHash === contentHash(doc)) {
    return normalizeRuns(runs.map(({ from, to, ink }) => ({ from, to, ink })));
  }
  const found: InkRun[] = [];
  for (const r of runs) {
    const at = bestMatch(doc, r);
    if (at !== null) found.push({ from: at, to: at + r.text.length, ink: r.ink });
  }
  return normalizeRuns(found);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/domain/ink-runs.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/services/ink-runs.ts tests/domain/ink-runs.test.ts
git commit -m "feat(domain): trechos de tinta com âncoras de texto

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Quebras de página (`page-breaks`)

**Files:**
- Create: `src/domain/services/page-breaks.ts`
- Test: `tests/domain/page-breaks.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface PageLayout { breakBefore: number[]; pageHeights: number[] }
  export function computePageBreaks(lineHeights: readonly number[], pageContentHeight: number): PageLayout
  ```
  `breakBefore` = índices (0-based) das linhas que abrem uma folha nova; `pageHeights[p]` = altura de conteúdo usada pela folha `p` (pode exceder `pageContentHeight` se um parágrafo for maior que uma folha). Sempre há ao menos uma folha.

- [ ] **Step 1: Escrever os testes que falham** — `tests/domain/page-breaks.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { computePageBreaks } from "../../src/domain/services/page-breaks";

describe("computePageBreaks", () => {
  it("documento vazio tem uma folha vazia", () => {
    expect(computePageBreaks([], 100)).toEqual({ breakBefore: [], pageHeights: [0] });
  });

  it("tudo cabe numa folha", () => {
    expect(computePageBreaks([30, 30, 30], 100)).toEqual({ breakBefore: [], pageHeights: [90] });
  });

  it("parágrafo que não cabe vai inteiro para a próxima folha", () => {
    expect(computePageBreaks([40, 40, 40], 100)).toEqual({
      breakBefore: [2],
      pageHeights: [80, 40],
    });
  });

  it("encaixe exato não quebra", () => {
    expect(computePageBreaks([50, 50, 10], 100)).toEqual({
      breakBefore: [2],
      pageHeights: [100, 10],
    });
  });

  it("parágrafo maior que uma folha estica a folha dele", () => {
    expect(computePageBreaks([20, 250, 20], 100)).toEqual({
      breakBefore: [1, 2],
      pageHeights: [20, 250, 20],
    });
  });

  it("primeiro parágrafo gigante não gera folha vazia antes", () => {
    expect(computePageBreaks([250], 100)).toEqual({ breakBefore: [], pageHeights: [250] });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/domain/page-breaks.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar** `src/domain/services/page-breaks.ts`:

```ts
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/domain/page-breaks.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/services/page-breaks.ts tests/domain/page-breaks.test.ts
git commit -m "feat(domain): quebra de página mantendo parágrafos juntos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: ⌘E, `data-style`, chrome derivado e seção do painel

**Files:**
- Modify: `src/ui/stores/workspace.svelte.ts`
- Modify: `src/ui/App.svelte`
- Modify: `src/ui/SettingsPanel.svelte`
- Modify: `src/ui/StatusBar.svelte`

**Interfaces:**
- Consumes: `nextWorkspaceStyle`, `WORKSPACE_STYLES`, `type WorkspaceStyle` (Task 1).
- Produces (no `Workspace`):
  - `export const WORKSPACE_STYLE_LABELS: Record<WorkspaceStyle, string>`
  - `get isRealTypewriter(): boolean`
  - `get chromeHidden(): boolean` — `zenMode || isRealTypewriter`
  - `cycleWorkspaceStyle(): void`
  - `<html data-style="…">` sempre setado
  - método privado `private guardRealTypewriter(): boolean` — mostra HUD e devolve `true` se o atalho deve ser ignorado

- [ ] **Step 1: Workspace — labels e getters.** Em `src/ui/stores/workspace.svelte.ts`, trocar o import do theme-config por:

```ts
import {
  DEFAULT_THEME,
  nextWorkspaceStyle,
  normalizeTheme,
  type ThemeConfig,
  type WorkspaceStyle,
} from "../../domain/entities/theme-config";
```

Logo abaixo de `export type SaveState = …`:

```ts
export const WORKSPACE_STYLE_LABELS: Record<WorkspaceStyle, string> = {
  standard: "padrão",
  "typewriter-real": "máquina de escrever",
  transparent: "transparência",
  paper: "papel",
};
```

Dentro da classe, logo antes de `get goalProgress()`:

```ts
  get isRealTypewriter(): boolean {
    return this.theme.workspaceStyle === "typewriter-real";
  }

  /** zen do usuário OU zen forçado do typewriter real (não toca em zenMode) */
  get chromeHidden(): boolean {
    return this.zenMode || this.isRealTypewriter;
  }
```

- [ ] **Step 2: Workspace — ciclo e guardas.** Na seção `// ── tema / settings`, depois de `toggleZen()`:

```ts
  cycleWorkspaceStyle(): void {
    const next = nextWorkspaceStyle(this.theme.workspaceStyle);
    this.updateTheme({ workspaceStyle: next });
    this.editor?.focus();
    this.showHud(`estilo: ${WORKSPACE_STYLE_LABELS[next]}`);
  }

  /** no typewriter real, foco/typewriter/sidebar/zen não se aplicam */
  private guardRealTypewriter(): boolean {
    if (!this.isRealTypewriter) return false;
    this.showHud("indisponível na máquina de escrever — ⌘E troca o estilo");
    return true;
  }
```

E inserir `if (this.guardRealTypewriter()) return;` como primeira linha de `toggleSidebar()`, `cycleFocusMode()`, `toggleTypewriter()` e `toggleZen()`.

- [ ] **Step 3: Workspace — `data-style`.** Em `applyThemeToDom()`, depois de `root.dataset.accent = this.theme.accent;`:

```ts
    root.dataset.style = this.theme.workspaceStyle;
```

- [ ] **Step 4: App — atalho e chrome.** Em `src/ui/App.svelte`:

Trocar o bloco do Escape no início de `onKeydown` por:

```ts
    if (e.key === "Escape" && workspace.zenMode && !workspace.isRealTypewriter) {
      workspace.toggleZen();
      return;
    }
```

Antes do `} else if (key === "j") {` acrescentar:

```ts
    } else if (key === "e" && !e.shiftKey) {
      e.preventDefault();
      workspace.cycleWorkspaceStyle();
```

No template, trocar **todas** as ocorrências de `workspace.zenMode` por `workspace.chromeHidden` (são 4: `{#if workspace.zenMode}` da faixa de arrastar, `!workspace.zenMode` da sidebar, do painel de ajustes e da status bar).

- [ ] **Step 5: Painel — seção de estilo.** Em `src/ui/SettingsPanel.svelte`, trocar o import do topo por:

```ts
  import { ACCENTS, EDITOR_FONTS, WORKSPACE_STYLES } from "../domain/entities/theme-config";
  import { WORKSPACE_STYLE_LABELS, type Workspace } from "./stores/workspace.svelte";
```

E inserir como **primeira** `<section>` dentro de `.scroll` (antes de "modo"):

```svelte
    <section>
      <p class="eyebrow label">estilo do workspace — ⌘E</p>
      <div class="stack">
        {#each WORKSPACE_STYLES as style (style)}
          <button
            class="fontopt"
            class:on={theme.workspaceStyle === style}
            onclick={() => workspace.updateTheme({ workspaceStyle: style })}
          >
            {WORKSPACE_STYLE_LABELS[style]}
          </button>
        {/each}
      </div>
    </section>
```

- [ ] **Step 6: Status bar — atalho no popover.** Em `src/ui/StatusBar.svelte`, na lista do `{#each [...]}` do popover, inserir `["⌘E", "estilo do workspace"]` logo depois de `["⌘⇧F", "modo zen — esc sai"]`.

- [ ] **Step 7: Verificar**

Run: `npm test && npm run check`
Expected: verde, 0 erros.

Run: `npm run tauri dev` e conferir manualmente:
1. ⌘E mostra HUD `estilo: máquina de escrever` e o chrome some (sem CSS ainda, o editor fica igual).
2. Nesse estilo, ⌘D/⌘T/⌘\/⌘⇧F mostram `indisponível na máquina de escrever — ⌘E troca o estilo`.
3. ⌘E de novo → `estilo: transparência`, chrome volta; ⌘E → `papel`; ⌘E → `padrão`.
4. Fechar e reabrir o app: o estilo persiste.
5. Painel ⌘, mostra a seção nova e troca o estilo ao clicar.

- [ ] **Step 8: Commit**

```bash
git add src/ui/stores/workspace.svelte.ts src/ui/App.svelte src/ui/SettingsPanel.svelte src/ui/StatusBar.svelte
git commit -m "feat(ui): ⌘E alterna o estilo do workspace

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Fase B — Transparência

### Task 5: Janela transparente + desfoque nativo

**Files:**
- Modify: `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/capabilities/default.json`
- Create: `src/application/ports/window-appearance.ts`
- Create: `src/infrastructure/tauri/tauri-window-appearance.ts`
- Create: `src/ui/styles/style-transparent.css`
- Modify: `src/main.ts`, `src/ui/stores/workspace.svelte.ts`, `src/ui/SettingsPanel.svelte`

**Interfaces:**
- Consumes: `type WindowBlur`, `windowOpacity`, `windowBlur` (Task 1); `data-style` (Task 4).
- Produces:
  - `export interface WindowAppearance { setBlur(level: WindowBlur): Promise<void> }`
  - `WorkspaceDeps.windowAppearance: WindowAppearance`
  - CSS vars `--tinta-window-alpha`, `--tinta-chrome-alpha` (strings `"75%"`)

- [ ] **Step 1: Tauri.** Em `src-tauri/tauri.conf.json`, dentro de `"app"`, acrescentar `"macOSPrivateApi": true,` antes de `"windows"`, e no objeto da janela acrescentar `"transparent": true` depois de `"hiddenTitle": true`. Em `src-tauri/Cargo.toml` trocar a linha do tauri por:

```toml
tauri = { version = "2", features = ["macos-private-api"] }
```

Em `src-tauri/capabilities/default.json`, acrescentar `"core:window:allow-set-effects"` à lista `permissions` (cobre `setEffects` e `clearEffects`, que usam o mesmo command).

- [ ] **Step 2: Porta** — `src/application/ports/window-appearance.ts`:

```ts
import type { WindowBlur } from "../../domain/entities/theme-config";

/** Aparência nativa da janela (desfoque atrás do conteúdo). */
export interface WindowAppearance {
  setBlur(level: WindowBlur): Promise<void>;
}
```

- [ ] **Step 3: Adapter** — `src/infrastructure/tauri/tauri-window-appearance.ts`:

```ts
import { Effect, EffectState, getCurrentWindow } from "@tauri-apps/api/window";
import type { WindowBlur } from "../../domain/entities/theme-config";
import type { WindowAppearance } from "../../application/ports/window-appearance";

const MATERIAL: Record<Exclude<WindowBlur, "off">, Effect> = {
  light: Effect.Sidebar,
  strong: Effect.HudWindow,
};

/** Vibrancy do macOS via setEffects — exige transparent + macOSPrivateApi. */
export class TauriWindowAppearance implements WindowAppearance {
  private current: WindowBlur = "off";

  async setBlur(level: WindowBlur): Promise<void> {
    if (level === this.current) return;
    this.current = level;
    const win = getCurrentWindow();
    if (level === "off") {
      await win.clearEffects();
    } else {
      await win.setEffects({ effects: [MATERIAL[level]], state: EffectState.Active });
    }
  }
}
```

- [ ] **Step 4: Workspace.** Em `src/ui/stores/workspace.svelte.ts`:

Import: `import type { WindowAppearance } from "../../application/ports/window-appearance";`

Em `WorkspaceDeps`, depois de `clock: Clock;`:

```ts
  windowAppearance: WindowAppearance;
```

Em `applyThemeToDom()`, depois de `root.dataset.style = …`:

```ts
    const alpha = (n: number) => `${Math.round(Math.min(1, n) * 100)}%`;
    root.style.setProperty("--tinta-window-alpha", alpha(this.theme.windowOpacity));
    root.style.setProperty("--tinta-chrome-alpha", alpha(this.theme.windowOpacity + 0.15));
    const blur = this.theme.workspaceStyle === "transparent" ? this.theme.windowBlur : "off";
    // sem desfoque nativo, a transparência ainda funciona — falha silenciosa
    void this.deps.windowAppearance.setBlur(blur).catch(() => {});
```

- [ ] **Step 5: Composition root.** Em `src/main.ts`: importar `import { TauriWindowAppearance } from "./infrastructure/tauri/tauri-window-appearance";`, importar `import "./ui/styles/style-transparent.css";` depois de `app.css`, e passar `windowAppearance: new TauriWindowAppearance(),` no objeto do `new Workspace({…})` depois de `clock: systemClock,`.

- [ ] **Step 6: CSS** — `src/ui/styles/style-transparent.css`:

```css
/* ─────────────────────────────────────────────────────────────────
   estilo transparência — o fundo fica translúcido (a janela é
   transparent no Tauri); as cores de texto não mudam, então as letras
   seguem 100% opacas. Chrome um pouco mais opaco para legibilidade.
   ─────────────────────────────────────────────────────────────── */

:root[data-style="transparent"] body {
  background: color-mix(in srgb, var(--ab-bg) var(--tinta-window-alpha), transparent);
}

:root[data-style="transparent"] {
  --tinta-panel-bg: color-mix(in srgb, var(--ab-bg) var(--tinta-chrome-alpha), transparent);
}

:root[data-style="transparent"] .statusbar,
:root[data-style="transparent"] .topbar {
  background: color-mix(in srgb, var(--ab-bg) var(--tinta-chrome-alpha), transparent);
}
```

`.statusbar` e `.topbar` são classes de componentes Svelte: o Svelte acrescenta uma classe de hash *além* do nome, então o seletor global casa, e `:root[data-style] .statusbar` (0,3,0) vence o escopado `.statusbar.svelte-x` (0,2,0).

- [ ] **Step 7: Controles no painel.** Em `src/ui/SettingsPanel.svelte`, trocar o import do theme-config por `import { ACCENTS, EDITOR_FONTS, WINDOW_BLURS, WORKSPACE_STYLES } from "../domain/entities/theme-config";` e, dentro da seção "estilo do workspace" criada no Task 4, depois do `</div>` do `.stack`:

```svelte
      {#if theme.workspaceStyle === "transparent"}
        <p class="eyebrow label sub">opacidade do fundo — {Math.round(theme.windowOpacity * 100)}%</p>
        <input
          type="range"
          min="0.15"
          max="1"
          step="0.05"
          value={theme.windowOpacity}
          oninput={(e) => workspace.updateTheme({ windowOpacity: Number(e.currentTarget.value) })}
        />
        <p class="eyebrow label sub">desfoque</p>
        <div class="segmented">
          {#each WINDOW_BLURS as blur (blur)}
            <button
              class:on={theme.windowBlur === blur}
              onclick={() => workspace.updateTheme({ windowBlur: blur })}
            >
              {{ off: "off", light: "leve", strong: "forte" }[blur]}
            </button>
          {/each}
        </div>
      {/if}
```

E no `<style>` do painel:

```css
  .sub {
    margin-top: var(--ab-space-4);
  }
```

- [ ] **Step 8: Verificar**

Run: `npm test && npm run check`
Expected: verde, 0 erros.

Run: `npm run tauri dev` (o Rust recompila por causa da feature nova) e conferir:
1. Estilo padrão: visual idêntico ao de antes (fundo opaco).
2. ⌘E até `transparência`: a área de trabalho aparece atrás, com desfoque leve. Texto nítido e opaco.
3. Slider de opacidade em 15%: quase só o desfoque; em 100%: opaco.
4. Desfoque `off`: área de trabalho nítida; `forte`: vidro fosco.
5. Status bar e topbar levemente mais opacas que o editor; sidebar e painel também.
6. Trocar para `papel`/`padrão`: desfoque some.
7. ⌘D, ⌘T, ⌘\, ⌘⇧F funcionam neste estilo.
8. Tema escuro + transparência: fundo ink translúcido.

- [ ] **Step 9: Commit**

```bash
git add src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/capabilities/default.json src/application/ports/window-appearance.ts src/infrastructure/tauri/tauri-window-appearance.ts src/ui/styles/style-transparent.css src/main.ts src/ui/stores/workspace.svelte.ts src/ui/SettingsPanel.svelte
git commit -m "feat: estilo transparência com opacidade ajustável e desfoque nativo

macOSPrivateApi é necessário para janela transparente no macOS — impede
publicação na Mac App Store; DMG não é afetado.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Fase C — Papel

### Task 6: Folhas A4 paginadas

**Files:**
- Create: `src/infrastructure/codemirror/paper-pages.ts`
- Create: `src/ui/styles/style-paper.css`
- Modify: `src/infrastructure/codemirror/editor.ts`
- Modify: `src/ui/stores/workspace.svelte.ts`, `src/ui/EditorPane.svelte`, `src/ui/StatusBar.svelte`, `src/main.ts`

**Interfaces:**
- Consumes: `computePageBreaks` (Task 3).
- Produces:
  - `export interface PageInfo { page: number; total: number }`
  - `export function paperPages(onPageInfo: (info: PageInfo) => void): Extension`
  - `EditorEvents.onPageInfo?(info: PageInfo | null): void`
  - `CmEditor`: `private readonly styleModeCompartment`, `private appliedStyleKey`, `styleKeyOf(config)` e `private styleExtension(config: ThemeConfig): Extension`
  - `Workspace.pageInfo = $state<PageInfo | null>(null)` e `onPageInfo(info: PageInfo | null): void`

- [ ] **Step 1: Extensão** — `src/infrastructure/codemirror/paper-pages.ts`:

```ts
import {
  type EditorState,
  type Extension,
  type Range,
  StateEffect,
  StateField,
} from "@codemirror/state";
import {
  type BlockInfo,
  BlockType,
  Decoration,
  type DecorationSet,
  EditorView,
  type LayerMarker,
  layer,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { computePageBreaks } from "../../domain/services/page-breaks";

export interface PageInfo {
  page: number;
  total: number;
}

/** A4: margem de 2,5 cm em 21 cm de largura */
const MARGIN_RATIO = 0.119;
const GAP = 32;
/** padding lateral do .cm-content (ver buildTheme) */
const CONTENT_PAD_X = 24;

interface Sheet {
  top: number;
  height: number;
}

interface Layout {
  decorations: DecorationSet;
  /** números de linha (1-based) que abrem folha nova */
  breakLines: number[];
  sheets: Sheet[];
  sheetLeft: number;
  sheetWidth: number;
}

const EMPTY: Layout = {
  decorations: Decoration.none,
  breakLines: [],
  sheets: [],
  sheetLeft: 0,
  sheetWidth: 0,
};

class Spacer extends WidgetType {
  constructor(readonly height: number) {
    super();
  }
  eq(other: Spacer) {
    return Math.abs(other.height - this.height) < 0.5;
  }
  toDOM() {
    const el = document.createElement("div");
    el.className = "tinta-page-spacer";
    el.style.height = `${this.height}px`;
    return el;
  }
  get estimatedHeight() {
    return this.height;
  }
  ignoreEvent() {
    return true;
  }
}

const setLayout = StateEffect.define<Layout>();

/** espaçadores vêm de StateField: block widgets não podem vir de plugins */
const layoutField = StateField.define<Layout>({
  create: () => EMPTY,
  update(value, tr) {
    for (const e of tr.effects) if (e.is(setLayout)) return e.value;
    return tr.docChanged ? { ...value, decorations: value.decorations.map(tr.changes) } : value;
  },
  provide: (f) => EditorView.decorations.from(f, (v) => v.decorations),
});

/**
 * Altura só do texto da linha. Com block widgets (nossos espaçadores), o
 * lineBlockAt devolve um bloco composto (`type` é array): somamos só as
 * partes de texto — os espaçadores nunca entram na conta, então a
 * paginação converge numa passada.
 */
function textHeight(block: BlockInfo): number {
  const parts = block.type;
  if (!Array.isArray(parts)) return block.height;
  return parts
    .filter((b: BlockInfo) => b.type === BlockType.Text)
    .reduce((sum: number, b: BlockInfo) => sum + b.height, 0);
}

function measureLayout(view: EditorView): Layout {
  const { state } = view;

  const content = view.contentDOM.getBoundingClientRect();
  const scroller = view.scrollDOM.getBoundingClientRect();
  const textWidth = Math.max(100, content.width - 2 * CONTENT_PAD_X);
  const margin = (textWidth * MARGIN_RATIO) / (1 - 2 * MARGIN_RATIO);
  const sheetWidth = textWidth + 2 * margin;
  const sheetHeight = sheetWidth * Math.SQRT2;
  const pageContent = sheetHeight - 2 * margin;

  const heights: number[] = [];
  for (let n = 1; n <= state.doc.lines; n++) {
    heights.push(textHeight(view.lineBlockAt(state.doc.line(n).from)));
  }
  const { breakBefore, pageHeights } = computePageBreaks(heights, pageContent);

  const widgets: Range<Decoration>[] = [];
  const spacer = (pos: number, height: number, side: number) =>
    widgets.push(Decoration.widget({ widget: new Spacer(height), block: true, side }).range(pos));

  spacer(0, margin, -1);
  const sheets: Sheet[] = [];
  let top = 0;
  pageHeights.forEach((used, p) => {
    const height = Math.max(pageContent, used) + 2 * margin;
    sheets.push({ top, height });
    const rest = Math.max(0, pageContent - used) + margin;
    const lineIndex = breakBefore[p];
    if (lineIndex !== undefined) {
      spacer(state.doc.line(lineIndex + 1).from, rest + GAP + margin, -1);
    } else {
      spacer(state.doc.length, rest + GAP, 1);
    }
    top += height + GAP;
  });

  // layers são posicionadas relativas ao conteúdo rolável do scroller
  const docOffset = view.documentTop - scroller.top + view.scrollDOM.scrollTop;
  return {
    decorations: Decoration.set(widgets, true),
    breakLines: breakBefore.map((i) => i + 1),
    sheets: sheets.map((s) => ({ top: s.top + docOffset, height: s.height })),
    sheetLeft: content.left - scroller.left + view.scrollDOM.scrollLeft + CONTENT_PAD_X - margin,
    sheetWidth,
  };
}

function sameLayout(a: Layout, b: Layout): boolean {
  if (a.breakLines.join() !== b.breakLines.join()) return false;
  if (a.sheets.length !== b.sheets.length) return false;
  if (Math.abs(a.sheetLeft - b.sheetLeft) > 0.5 || Math.abs(a.sheetWidth - b.sheetWidth) > 0.5)
    return false;
  return a.sheets.every(
    (s, i) =>
      Math.abs(s.top - b.sheets[i]!.top) < 0.5 && Math.abs(s.height - b.sheets[i]!.height) < 0.5,
  );
}

class SheetMarker implements LayerMarker {
  constructor(
    readonly left: number,
    readonly top: number,
    readonly width: number,
    readonly height: number,
    readonly page: number,
  ) {}
  draw() {
    const el = document.createElement("div");
    el.className = "tinta-sheet";
    this.adjust(el);
    return el;
  }
  update(el: HTMLElement, prev: SheetMarker) {
    if (prev.page !== this.page || !this.eq(prev)) this.adjust(el);
    return true;
  }
  eq(o: SheetMarker) {
    return (
      o.left === this.left &&
      o.top === this.top &&
      o.width === this.width &&
      o.height === this.height &&
      o.page === this.page
    );
  }
  private adjust(el: HTMLElement) {
    el.style.left = `${this.left}px`;
    el.style.top = `${this.top}px`;
    el.style.width = `${this.width}px`;
    el.style.height = `${this.height}px`;
    el.dataset.page = String(this.page);
  }
}

const sheetsLayer = layer({
  above: false,
  class: "tinta-paper-layer",
  markers(view) {
    const l = view.state.field(layoutField);
    return l.sheets.map((s, i) => new SheetMarker(l.sheetLeft, s.top, l.sheetWidth, s.height, i + 1));
  },
  update(update) {
    return update.startState.field(layoutField) !== update.state.field(layoutField);
  },
});

function pageOf(state: EditorState, pos: number): number {
  const line = state.doc.lineAt(pos).number;
  return 1 + state.field(layoutField).breakLines.filter((n) => n <= line).length;
}

/**
 * Estilo papel: folhas A4 atrás do texto (layer) + espaçadores entre
 * parágrafos onde uma folha enche. Mede na fase read do CodeMirror e
 * aplica num microtask — dispatch dentro do ciclo de medida é proibido.
 */
export function paperPages(onPageInfo: (info: PageInfo) => void): Extension {
  const plugin = ViewPlugin.fromClass(
    class {
      private lastInfo = "";
      constructor(view: EditorView) {
        this.schedule(view);
      }
      update(u: ViewUpdate) {
        if (u.docChanged || u.geometryChanged || u.viewportChanged) this.schedule(u.view);
        if (u.selectionSet || u.docChanged || u.transactions.some((t) => t.effects.some((e) => e.is(setLayout))))
          this.report(u.view);
      }
      schedule(view: EditorView) {
        view.requestMeasure({
          key: this,
          read: (v) => measureLayout(v),
          write: (layout, v) => {
            if (sameLayout(layout, v.state.field(layoutField))) return;
            queueMicrotask(() => v.dispatch({ effects: setLayout.of(layout) }));
          },
        });
      }
      report(view: EditorView) {
        const info = {
          page: pageOf(view.state, view.state.selection.main.head),
          total: view.state.field(layoutField).sheets.length || 1,
        };
        const key = `${info.page}/${info.total}`;
        if (key === this.lastInfo) return;
        this.lastInfo = key;
        onPageInfo(info);
      }
    },
  );
  return [layoutField, plugin, sheetsLayer, EditorView.editorAttributes.of({ class: "tinta-paper" })];
}
```

- [ ] **Step 2: Editor.** Em `src/infrastructure/codemirror/editor.ts`:

Imports: `import type { Extension } from "@codemirror/state";` (juntar ao import existente de `@codemirror/state`) e `import { paperPages, type PageInfo } from "./paper-pages";`.

Em `EditorEvents`:

```ts
  /** folha atual / total no estilo papel; null fora dele */
  onPageInfo?(info: PageInfo | null): void;
```

Campos novos:

```ts
  private readonly styleModeCompartment = new Compartment();
  /** chave do que está no styleModeCompartment — evita recriar plugins a cada ajuste */
  private appliedStyleKey: string | null = null;
```

Funções de módulo (acima da classe):

```ts
/** o que muda a extensão do estilo: o próprio estilo e o desgaste da tinta */
const styleKeyOf = (config: ThemeConfig) => `${config.workspaceStyle}:${config.inkWear}`;
```

Método novo (depois de `posExtension`):

```ts
  /** extensão do estilo do workspace ativo (⌘E) */
  private styleExtension(config: ThemeConfig): Extension {
    switch (config.workspaceStyle) {
      case "paper":
        return paperPages((info) => this.events.onPageInfo?.(info));
      default:
        return [];
    }
  }
```

Em `makeState`, logo antes do `return EditorState.create(…)`: `this.appliedStyleKey = styleKeyOf(this.config);` — e no array de extensions, depois da linha do `grammarCompartment`: `this.styleModeCompartment.of(this.styleExtension(this.config)),`

Em `applyConfig`, trocar o `this.view.dispatch({ effects: [ … ] })` por um array montado antes (os `reconfigure` existentes ficam como estão) e reconfigurar o estilo só quando a chave mudar — `applyConfig` roda a cada `updateTheme`, e uma extensão nova recriaria os plugins a cada slider:

```ts
    const effects: StateEffect<unknown>[] = [
      /* …os reconfigure existentes, sem mudança… */
    ];
    const key = styleKeyOf(config);
    if (key !== this.appliedStyleKey) {
      effects.push(this.styleModeCompartment.reconfigure(this.styleExtension(config)));
      this.appliedStyleKey = key;
    }
    this.view.dispatch({ effects });
    if (config.workspaceStyle !== "paper") this.events.onPageInfo?.(null);
```

(importar `StateEffect` como tipo junto de `Compartment` de `@codemirror/state`.)

Em `openDocument`, no ramo do cache, zerar `this.appliedStyleKey = null;` logo antes do `this.applyConfig(this.config)` — o estado cacheado pode ter sido criado com outro estilo.

- [ ] **Step 3: Workspace + EditorPane + StatusBar.**

`src/ui/stores/workspace.svelte.ts` — import `import type { PageInfo } from "../../infrastructure/codemirror/paper-pages";`, campo depois de `ready = $state(false);`:

```ts
  /** folha atual / total no estilo papel */
  pageInfo = $state<PageInfo | null>(null);
```

e método depois de `onDocChanged`:

```ts
  onPageInfo(info: PageInfo | null): void {
    this.pageInfo = info;
  }
```

`src/ui/EditorPane.svelte` — no objeto de eventos do `new CmEditor(…)`, acrescentar `onPageInfo: (info) => workspace.onPageInfo(info),`.

`src/ui/StatusBar.svelte` — dentro de `.cell.right`, antes de `{#if modeLabel}`:

```svelte
    {#if workspace.pageInfo}
      <span class="dim">página {workspace.pageInfo.page} de {workspace.pageInfo.total}</span>
    {/if}
```

`src/main.ts` — `import "./ui/styles/style-paper.css";` depois do `style-transparent.css`.

- [ ] **Step 4: CSS** — `src/ui/styles/style-paper.css`:

```css
/* ─────────────────────────────────────────────────────────────────
   estilo papel — folhas A4 sobre uma mesa. A sombra das folhas é a
   única exceção ao "sem sombras" do brandbook, restrita a este estilo.
   ─────────────────────────────────────────────────────────────── */

:root[data-style="paper"] {
  --tinta-desk: #d9d2c8;
  --tinta-sheet: #ffffff;
}

:root[data-style="paper"][data-theme="dark"] {
  --tinta-desk: #1a1a1b;
  --tinta-sheet: #2a2a2b;
}

/* isolation: a layer das folhas (z-index negativo) fica acima do fundo da mesa */
.tinta-paper .cm-scroller {
  background: var(--tinta-desk);
  isolation: isolate;
}

/* com ⌘T ligado, vale a folga do typewriter scrolling */
.tinta-paper:not(.tinta-typewriter) .cm-content {
  padding-top: 32px !important;
  padding-bottom: 32px !important;
}

.tinta-paper-layer {
  z-index: -2;
}

.tinta-sheet {
  position: absolute;
  background: var(--tinta-sheet);
  box-shadow: 0 2px 12px rgb(0 0 0 / 0.12);
}

.tinta-sheet::after {
  content: attr(data-page);
  position: absolute;
  bottom: 18px;
  left: 0;
  right: 0;
  text-align: center;
  font-family: var(--ab-font-mono);
  font-size: var(--ab-size-eyebrow);
  letter-spacing: var(--ab-tracking-wide);
  color: var(--tinta-dim);
}
```

- [ ] **Step 5: Verificar**

Run: `npm test && npm run check`
Expected: verde, 0 erros.

Run: `npm run tauri dev`, abrir uma nota longa (ou colar ~3 páginas de texto) e conferir:
1. ⌘E até `papel`: mesa de fundo, folhas brancas com sombra, número no pé.
2. Um parágrafo que não cabe no fim da folha começa no topo da folha seguinte; nenhuma linha atravessa o vão.
3. Um parágrafo maior que uma folha estica aquela folha.
4. Status bar: `página N de M` acompanha o cursor; some ao sair do estilo.
5. Digitar no fim de uma folha empurra o parágrafo para a próxima sem tremer (1 ajuste, sem loop).
6. Redimensionar a janela recalcula as folhas.
7. ⌘D, ⌘T, ⌘\, ⌘⇧F funcionam; no zen a mesa e as folhas ficam.
8. Tema escuro: mesa quase preta, folha grafite, texto claro.

- [ ] **Step 6: Commit**

```bash
git add src/infrastructure/codemirror/paper-pages.ts src/infrastructure/codemirror/editor.ts src/ui/styles/style-paper.css src/ui/stores/workspace.svelte.ts src/ui/EditorPane.svelte src/ui/StatusBar.svelte src/main.ts
git commit -m "feat: estilo papel com folhas A4 paginadas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Fase D — Tinta por trecho

### Task 7: Porta `InkStore`, commands Rust e caso de uso de persistência

**Files:**
- Create: `src/application/ports/ink-store.ts`
- Create: `src/application/use-cases/ink-persistence.ts`
- Create: `src/infrastructure/tauri/tauri-ink-store.ts`
- Create: `src-tauri/src/commands/ink.rs`
- Modify: `src-tauri/src/commands/mod.rs`, `src-tauri/src/lib.rs`
- Create: `tests/fakes/in-memory-ink-store.ts`
- Test: `tests/application/ink-persistence.test.ts`

**Interfaces:**
- Consumes: `serializeRuns`, `parseStoredInk`, `resolveRuns`, `type InkRun` (Task 2); `saveNote` e `InMemoryNoteRepository` (existentes).
- Produces:
  ```ts
  // ports/ink-store.ts
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
  // use-cases/ink-persistence.ts
  export interface InkSession { lastSaved: string | null; unreadable: boolean }
  export const FRESH_INK_SESSION: InkSession
  export function loadInk(store: InkStore, root: string, notePath: string, doc: string): Promise<{ runs: InkRun[]; session: InkSession }>
  export function saveInk(store: InkStore, root: string, notePath: string, doc: string, runs: readonly InkRun[], session: InkSession): Promise<InkSession>
  ```
  Commands Rust: `read_ink(root, path) -> Option<String>`, `write_ink(root, path, content: Option<String>)`, `move_ink(root, from, to)`, `trash_ink(root, path)`.

- [ ] **Step 1: Porta** — `src/application/ports/ink-store.ts`:

```ts
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
```

- [ ] **Step 2: Fake** — `tests/fakes/in-memory-ink-store.ts`:

```ts
import type { InkStore } from "../../src/application/ports/ink-store";

/** Fake em memória do lateral de tinta; conta gravações para os testes. */
export class InMemoryInkStore implements InkStore {
  files = new Map<string, string>();
  saves = 0;

  async load(_root: string, notePath: string): Promise<string | null> {
    return this.files.get(notePath) ?? null;
  }

  async save(_root: string, notePath: string, content: string | null): Promise<void> {
    this.saves++;
    if (content === null) this.files.delete(notePath);
    else this.files.set(notePath, content);
  }

  async move(_root: string, from: string, to: string): Promise<void> {
    for (const [path, content] of [...this.files]) {
      if (path === from || path.startsWith(`${from}/`)) {
        this.files.delete(path);
        this.files.set(to + path.slice(from.length), content);
      }
    }
  }

  async trash(_root: string, path: string): Promise<void> {
    for (const key of [...this.files.keys()]) {
      if (key === path || key.startsWith(`${path}/`)) this.files.delete(key);
    }
  }
}
```

- [ ] **Step 3: Testes que falham** — `tests/application/ink-persistence.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  FRESH_INK_SESSION,
  loadInk,
  saveInk,
} from "../../src/application/use-cases/ink-persistence";
import { openNote } from "../../src/application/use-cases/open-note";
import { saveNote } from "../../src/application/use-cases/save-note";
import { recolor, type InkRun } from "../../src/domain/services/ink-runs";
import { InMemoryInkStore } from "../fakes/in-memory-ink-store";
import { InMemoryNoteRepository } from "../fakes/in-memory-note-repository";

const ROOT = "/w";
const NOTE = "/w/cap1.md";
const blue = (from: number, to: number): InkRun => ({ from, to, ink: "blue" });

describe("saveInk", () => {
  it("nota sem cor nunca grava lateral", async () => {
    const store = new InMemoryInkStore();
    await saveInk(store, ROOT, NOTE, "texto", [], FRESH_INK_SESSION);
    expect(store.saves).toBe(0);
  });

  it("grava quando há cor e não regrava se nada mudou", async () => {
    const store = new InMemoryInkStore();
    const s1 = await saveInk(store, ROOT, NOTE, "texto azul", [blue(6, 10)], FRESH_INK_SESSION);
    await saveInk(store, ROOT, NOTE, "texto azul", [blue(6, 10)], s1);
    expect(store.saves).toBe(1);
    expect(store.files.has(NOTE)).toBe(true);
  });

  it("tirar toda a cor apaga o lateral", async () => {
    const store = new InMemoryInkStore();
    const s1 = await saveInk(store, ROOT, NOTE, "texto azul", [blue(6, 10)], FRESH_INK_SESSION);
    await saveInk(store, ROOT, NOTE, "texto azul", [], s1);
    expect(store.files.has(NOTE)).toBe(false);
  });

  it("lateral ilegível não é sobrescrito enquanto não houver cor", async () => {
    const store = new InMemoryInkStore();
    store.files.set(NOTE, "{lixo de uma versão futura");
    const { session } = await loadInk(store, ROOT, NOTE, "texto");
    expect(session.unreadable).toBe(true);

    await saveInk(store, ROOT, NOTE, "texto", [], session);
    expect(store.files.get(NOTE)).toBe("{lixo de uma versão futura");

    await saveInk(store, ROOT, NOTE, "texto", [blue(0, 5)], session);
    expect(store.files.get(NOTE)).not.toBe("{lixo de uma versão futura");
  });
});

describe("loadInk", () => {
  it("sem lateral → sem trechos", async () => {
    const { runs, session } = await loadInk(new InMemoryInkStore(), ROOT, NOTE, "texto");
    expect(runs).toEqual([]);
    expect(session).toEqual(FRESH_INK_SESSION);
  });

  it("reabre as cores gravadas", async () => {
    const store = new InMemoryInkStore();
    await saveInk(store, ROOT, NOTE, "texto azul", [blue(6, 10)], FRESH_INK_SESSION);
    const { runs } = await loadInk(store, ROOT, NOTE, "texto azul");
    expect(runs).toEqual([blue(6, 10)]);
  });

  it("após edição externa, reancora e marca para regravar", async () => {
    const store = new InMemoryInkStore();
    await saveInk(store, ROOT, NOTE, "texto azul", [blue(6, 10)], FRESH_INK_SESSION);
    const { runs, session } = await loadInk(store, ROOT, NOTE, "novo texto azul");
    expect(runs).toEqual([blue(11, 15)]);
    await saveInk(store, ROOT, NOTE, "novo texto azul", runs, session);
    expect(store.saves).toBe(2);
  });
});

describe("princípio: a nota nunca recebe cor", () => {
  it("qualquer recoloração deixa o arquivo da nota idêntico ao texto", async () => {
    const repo = new InMemoryNoteRepository();
    const store = new InMemoryInkStore();
    const text = "Uma frase azul, outra vermelha e o resto preto.";
    repo.externallyModify(NOTE, "");
    const note = await openNote(repo, NOTE);

    let runs: InkRun[] = [];
    runs = recolor(runs, 9, 13, "blue");
    runs = recolor(runs, 21, 29, "red");
    runs = recolor(runs, 0, 3, "blue");
    runs = recolor(runs, 10, 25, "black");

    await saveNote(repo, note, text);
    await saveInk(store, ROOT, NOTE, text, runs, FRESH_INK_SESSION);

    expect((await repo.read(NOTE)).content).toBe(text);
    expect(store.files.get(NOTE)).toContain('"ink":"blue"');
  });
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `npx vitest run tests/application/ink-persistence.test.ts`
Expected: FAIL — módulo `ink-persistence` não existe.

- [ ] **Step 5: Caso de uso** — `src/application/use-cases/ink-persistence.ts`:

```ts
import {
  parseStoredInk,
  resolveRuns,
  serializeRuns,
  type InkRun,
} from "../../domain/services/ink-runs";
import type { InkStore } from "../ports/ink-store";

/** estado do lateral da nota aberta */
export interface InkSession {
  /** JSON exatamente como está em disco (null = sem lateral) */
  lastSaved: string | null;
  /** existe lateral mas não o entendemos — não sobrescrever sem cor nova */
  unreadable: boolean;
}

export const FRESH_INK_SESSION: InkSession = { lastSaved: null, unreadable: false };

export async function loadInk(
  store: InkStore,
  root: string,
  notePath: string,
  doc: string,
): Promise<{ runs: InkRun[]; session: InkSession }> {
  const text = await store.load(root, notePath);
  if (text === null) return { runs: [], session: FRESH_INK_SESSION };
  const stored = parseStoredInk(text);
  if (!stored) return { runs: [], session: { lastSaved: text, unreadable: true } };
  return { runs: resolveRuns(doc, stored), session: { lastSaved: text, unreadable: false } };
}

/**
 * Grava o lateral se a serialização mudou. Notas sem cor nunca geram I/O.
 * Chamar DEPOIS do saveNote, com o mesmo texto que foi para a nota.
 */
export async function saveInk(
  store: InkStore,
  root: string,
  notePath: string,
  doc: string,
  runs: readonly InkRun[],
  session: InkSession,
): Promise<InkSession> {
  const stored = serializeRuns(doc, runs);
  if (stored === null && session.unreadable) return session;
  const text = stored ? JSON.stringify(stored) : null;
  if (text === session.lastSaved) return session;
  await store.save(root, notePath, text);
  return { lastSaved: text, unreadable: false };
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run tests/application/ink-persistence.test.ts`
Expected: PASS.

- [ ] **Step 7: Rust** — `src-tauri/src/commands/ink.rs`:

```rust
use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};

use super::atomic_write;

/// Laterais de tinta: `<root>/.ink/<rel>.json`. Pasta oculta → fora do
/// scan_library; o watcher só reage a .md/.txt, então não dispara recarga.
const INK_DIR: &str = ".ink";

fn rel_in_ink(root: &str, path: &str) -> Result<PathBuf, String> {
    let rootp = Path::new(root);
    let rel = Path::new(path)
        .strip_prefix(rootp)
        .map_err(|_| format!("fora da biblioteca: {path}"))?;
    Ok(rootp.join(INK_DIR).join(rel))
}

/// lateral de uma nota: `.ink/<rel>.json`
fn ink_file(root: &str, note: &str) -> Result<PathBuf, String> {
    let mut p = rel_in_ink(root, note)?;
    let name = p
        .file_name()
        .map(|s| format!("{}.json", s.to_string_lossy()))
        .ok_or_else(|| format!("caminho sem nome: {note}"))?;
    p.set_file_name(name);
    Ok(p)
}

fn ignore_missing(result: std::io::Result<()>, what: &str) -> Result<(), String> {
    match result {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == ErrorKind::NotFound => Ok(()),
        Err(e) => Err(format!("{what}: {e}")),
    }
}

#[tauri::command]
pub fn read_ink(root: String, path: String) -> Result<Option<String>, String> {
    let p = ink_file(&root, &path)?;
    match fs::read_to_string(&p) {
        Ok(s) => Ok(Some(s)),
        Err(e) if e.kind() == ErrorKind::NotFound => Ok(None),
        Err(e) => Err(format!("ler tinta: {e}")),
    }
}

#[tauri::command]
pub fn write_ink(root: String, path: String, content: Option<String>) -> Result<(), String> {
    let p = ink_file(&root, &path)?;
    match content {
        Some(c) => atomic_write(&p, &c),
        None => ignore_missing(fs::remove_file(&p), "apagar tinta"),
    }
}

/// Chamado DEPOIS do rename da nota/pasta: `to` já existe em disco.
#[tauri::command]
pub fn move_ink(root: String, from: String, to: String) -> Result<(), String> {
    let (src, dest) = if Path::new(&to).is_dir() {
        (rel_in_ink(&root, &from)?, rel_in_ink(&root, &to)?)
    } else {
        (ink_file(&root, &from)?, ink_file(&root, &to)?)
    };
    if !src.exists() {
        return Ok(());
    }
    if dest.is_file() {
        // lateral órfão de uma nota antiga com o mesmo nome
        fs::remove_file(&dest).map_err(|e| format!("limpar tinta antiga: {e}"))?;
    } else if dest.exists() {
        return Ok(());
    }
    if let Some(dir) = dest.parent() {
        fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    fs::rename(&src, &dest).map_err(|e| format!("mover tinta: {e}"))
}

/// A nota já foi para a Lixeira: não dá para saber se era nota ou pasta,
/// então tenta os dois laterais possíveis.
#[tauri::command]
pub fn trash_ink(root: String, path: String) -> Result<(), String> {
    for p in [ink_file(&root, &path)?, rel_in_ink(&root, &path)?] {
        if p.exists() {
            trash::delete(&p).map_err(|e| format!("tinta para a lixeira: {e}"))?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn caminho_do_lateral_espelha_a_biblioteca() {
        let p = ink_file("/lib", "/lib/livro/cap-01.md").unwrap();
        assert_eq!(p, PathBuf::from("/lib/.ink/livro/cap-01.md.json"));
    }

    #[test]
    fn nota_fora_da_biblioteca_e_erro() {
        assert!(ink_file("/lib", "/outro/cap.md").is_err());
    }
}
```

`src-tauri/src/commands/mod.rs` — acrescentar `pub mod ink;` na lista de módulos (ordem alfabética: antes de `pub mod library;`).

`src-tauri/src/lib.rs` — `use commands::{ink, library, notes, snapshots, storage};` e no `generate_handler![…]`, depois de `notes::delete_note,`:

```rust
            ink::read_ink,
            ink::write_ink,
            ink::move_ink,
            ink::trash_ink,
```

- [ ] **Step 8: Testes Rust**

Run: `cd src-tauri && cargo test ink && cd ..`
Expected: `2 passed`.

- [ ] **Step 9: Adapter** — `src/infrastructure/tauri/tauri-ink-store.ts`:

```ts
import { invoke } from "@tauri-apps/api/core";
import type { InkStore } from "../../application/ports/ink-store";

/** Adapter da porta InkStore sobre os commands Rust de tinta. */
export class TauriInkStore implements InkStore {
  load(root: string, notePath: string): Promise<string | null> {
    return invoke<string | null>("read_ink", { root, path: notePath });
  }

  save(root: string, notePath: string, content: string | null): Promise<void> {
    return invoke("write_ink", { root, path: notePath, content });
  }

  move(root: string, from: string, to: string): Promise<void> {
    return invoke("move_ink", { root, from, to });
  }

  trash(root: string, path: string): Promise<void> {
    return invoke("trash_ink", { root, path });
  }
}
```

- [ ] **Step 10: Suite + check + commit**

Run: `npm test && npm run check`
Expected: verde, 0 erros.

```bash
git add src/application/ports/ink-store.ts src/application/use-cases/ink-persistence.ts src/infrastructure/tauri/tauri-ink-store.ts src-tauri/src/commands/ink.rs src-tauri/src/commands/mod.rs src-tauri/src/lib.rs tests/fakes/in-memory-ink-store.ts tests/application/ink-persistence.test.ts
git commit -m "feat: lateral de tinta em .ink/ — porta, commands Rust e persistência

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Trechos de tinta no CodeMirror

**Files:**
- Create: `src/infrastructure/codemirror/ink-field.ts`
- Create: `src/infrastructure/codemirror/ink.ts`
- Modify: `src/infrastructure/codemirror/editor.ts`
- Modify: `src/ui/styles/app.css`
- Test: `tests/infrastructure/ink-field.test.ts`

**Interfaces:**
- Consumes: `recolor`, `normalizeRuns`, `type InkRun` (Task 2); `type Ink` (Task 1).
- Produces:
  ```ts
  // ink-field.ts (só @codemirror/state)
  export interface InkMode { active: Ink; choose: boolean }
  export const setInkMode: StateEffectType<InkMode>
  export const replaceInkRuns: StateEffectType<InkRun[]>
  export function inkField(initial: readonly InkRun[], mode: InkMode): Extension
  export function inkRunsOf(state: EditorState): InkRun[]
  export function recolorSelectionSpec(state: EditorState, ink: Ink): TransactionSpec | null
  // ink.ts
  export const inkDecorations: Extension
  // CmEditor
  openDocument(path: string, content: string, inkRuns?: readonly InkRun[]): void
  currentInkRuns(): InkRun[]
  recolorSelection(ink: Ink): boolean
  ```
  Regra de modo: `choose = config.workspaceStyle === "typewriter-real"`; `active = choose ? config.ink : "black"`.

- [ ] **Step 1: Testes que falham** — `tests/infrastructure/ink-field.test.ts`:

```ts
import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import type { InkRun } from "../../src/domain/services/ink-runs";
import {
  inkField,
  inkRunsOf,
  recolorSelectionSpec,
  setInkMode,
} from "../../src/infrastructure/codemirror/ink-field";

// Única suíte que toca CodeMirror: só @codemirror/state, que é JS puro (sem DOM).
const blue = (from: number, to: number): InkRun => ({ from, to, ink: "blue" });

function stateWith(doc: string, runs: InkRun[], choose: boolean, active: "black" | "blue" | "red" = "black") {
  return EditorState.create({ doc, extensions: inkField(runs, { active, choose }) });
}

const insert = (s: EditorState, at: number, text: string) =>
  s.update({ changes: { from: at, insert: text }, userEvent: "input.type" }).state;

describe("inkField — fora do typewriter real (herda a cor)", () => {
  it("digitar no fim de um trecho estende", () => {
    const s = insert(stateWith("azul preto", [blue(0, 4)], false), 4, "ado");
    expect(inkRunsOf(s)).toEqual([blue(0, 7)]);
  });

  it("digitar no meio estende", () => {
    const s = insert(stateWith("azul", [blue(0, 4)], false), 2, "XX");
    expect(inkRunsOf(s)).toEqual([blue(0, 6)]);
  });

  it("digitar antes do trecho não colore e desloca", () => {
    const s = insert(stateWith("azul", [blue(0, 4)], false), 0, "o ");
    expect(inkRunsOf(s)).toEqual([blue(2, 6)]);
  });

  it("apagar o trecho todo remove a cor", () => {
    const s0 = stateWith("ab azul cd", [blue(3, 7)], false);
    const s = s0.update({ changes: { from: 3, to: 7 } }).state;
    expect(inkRunsOf(s)).toEqual([]);
  });
});

describe("inkField — typewriter real (tinta ativa)", () => {
  it("tinta azul ativa colore o que é digitado", () => {
    const s = insert(stateWith("abc", [], true, "blue"), 3, " def");
    expect(inkRunsOf(s)).toEqual([blue(3, 7)]);
  });

  it("tinta preta dentro de um trecho azul corta o trecho", () => {
    const s = insert(stateWith("azul", [blue(0, 4)], true, "black"), 2, "XX");
    expect(inkRunsOf(s)).toEqual([blue(0, 2), blue(4, 6)]);
  });

  it("trocar o modo por efeito vale para a próxima digitação", () => {
    const s0 = stateWith("abc", [], false);
    const s1 = s0.update({ effects: setInkMode.of({ active: "red", choose: true }) }).state;
    const s = insert(s1, 3, "x");
    expect(inkRunsOf(s)).toEqual([{ from: 3, to: 4, ink: "red" }]);
  });
});

describe("recolorSelectionSpec", () => {
  it("seleção vazia → null", () => {
    expect(recolorSelectionSpec(stateWith("abc", [], true), "blue")).toBeNull();
  });

  it("recolore só a seleção", () => {
    const s0 = EditorState.create({
      doc: "abcdef",
      selection: { anchor: 1, head: 4 },
      extensions: inkField([], { active: "black", choose: true }),
    });
    const s = s0.update(recolorSelectionSpec(s0, "blue")!).state;
    expect(inkRunsOf(s)).toEqual([blue(1, 4)]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/infrastructure/ink-field.test.ts`
Expected: FAIL — módulo `ink-field` não existe.

- [ ] **Step 3: Field** — `src/infrastructure/codemirror/ink-field.ts`:

```ts
import {
  type ChangeDesc,
  type EditorState,
  type Extension,
  StateEffect,
  StateField,
  type TransactionSpec,
} from "@codemirror/state";
import type { Ink } from "../../domain/entities/theme-config";
import { normalizeRuns, recolor, type InkRun } from "../../domain/services/ink-runs";

/**
 * Trechos de tinta da sessão. Vivem no EditorState (o cache por nota do
 * CmEditor já os preserva) e são mapeados pelas mudanças do documento.
 * Só depende de @codemirror/state — testável sem DOM.
 */
export interface InkMode {
  /** tinta aplicada ao que é digitado quando `choose` */
  active: Ink;
  /** typewriter real: o texto inserido recebe a tinta ativa; senão herda a cor vizinha */
  choose: boolean;
}

interface InkState extends InkMode {
  runs: InkRun[];
}

export const setInkMode = StateEffect.define<InkMode>();
export const replaceInkRuns = StateEffect.define<InkRun[]>();

function mapRuns(runs: readonly InkRun[], changes: ChangeDesc, choose: boolean): InkRun[] {
  // início com assoc 1: texto inserido logo antes do trecho fica de fora;
  // fim com assoc 1 (herança) estende o trecho; com -1 (tinta ativa) não
  const endAssoc = choose ? -1 : 1;
  return runs.map((r) => ({
    ink: r.ink,
    from: changes.mapPos(r.from, 1),
    to: changes.mapPos(r.to, endAssoc),
  }));
}

const field = StateField.define<InkState>({
  create: () => ({ runs: [], active: "black", choose: false }),
  update(value, tr) {
    let { runs, active, choose } = value;
    for (const e of tr.effects) {
      if (e.is(setInkMode)) ({ active, choose } = e.value);
      if (e.is(replaceInkRuns)) runs = e.value;
    }
    if (tr.docChanged) {
      runs = mapRuns(runs, tr.changes, choose);
      if (choose) {
        tr.changes.iterChanges((_fromA, _toA, fromB, toB) => {
          if (toB > fromB) runs = recolor(runs, fromB, toB, active);
        });
      }
      runs = normalizeRuns(runs);
    }
    if (runs === value.runs && active === value.active && choose === value.choose) return value;
    return { runs, active, choose };
  },
});

export function inkField(initial: readonly InkRun[], mode: InkMode): Extension {
  return field.init(() => ({ runs: normalizeRuns(initial), ...mode }));
}

export function inkRunsOf(state: EditorState): InkRun[] {
  return state.field(field, false)?.runs ?? [];
}

/** transação que recolore a seleção principal; null se a seleção é vazia */
export function recolorSelectionSpec(state: EditorState, ink: Ink): TransactionSpec | null {
  const { from, to } = state.selection.main;
  if (from === to) return null;
  return {
    effects: replaceInkRuns.of(recolor(inkRunsOf(state), from, to, ink)),
    userEvent: "ink.recolor",
  };
}

export { field as inkStateField };
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/infrastructure/ink-field.test.ts`
Expected: PASS.

- [ ] **Step 5: Decorações + undo** — `src/infrastructure/codemirror/ink.ts`:

```ts
import { invertedEffects } from "@codemirror/commands";
import type { Extension } from "@codemirror/state";
import { Decoration, EditorView } from "@codemirror/view";
import { inkRunsOf, inkStateField, replaceInkRuns } from "./ink-field";

const marks = {
  blue: Decoration.mark({ class: "cm-ink-blue" }),
  red: Decoration.mark({ class: "cm-ink-red" }),
};

/** pinta os trechos (poucos por nota — o doc inteiro é barato) */
const decorations = EditorView.decorations.compute([inkStateField], (state) =>
  Decoration.set(inkRunsOf(state).map((r) => marks[r.ink].range(r.from, r.to))),
);

/** ⌘Z desfaz uma recoloração como desfaz texto */
const undoableRecolor = invertedEffects.of((tr) =>
  tr.effects.some((e) => e.is(replaceInkRuns))
    ? [replaceInkRuns.of(inkRunsOf(tr.startState))]
    : [],
);

export const inkDecorations: Extension = [decorations, undoableRecolor];
```

- [ ] **Step 6: CSS das tintas** — acrescentar ao fim de `src/ui/styles/app.css`:

```css
/* tinta por trecho — a cor vive no lateral .ink/, nunca na nota */
:root {
  --tinta-ink-blue: #1f3a93;
  --tinta-ink-red: #a3231f;
}

:root[data-theme="dark"] {
  --tinta-ink-blue: #7f9be0;
  --tinta-ink-red: #e0675f;
}

.cm-ink-blue { color: var(--tinta-ink-blue); }
.cm-ink-red { color: var(--tinta-ink-red); }
```

- [ ] **Step 7: Editor.** Em `src/infrastructure/codemirror/editor.ts`:

Imports:

```ts
import type { Ink, ThemeConfig } from "../../domain/entities/theme-config";
import type { InkRun } from "../../domain/services/ink-runs";
import { inkDecorations } from "./ink";
import { inkField, inkRunsOf, recolorSelectionSpec, setInkMode, type InkMode } from "./ink-field";
```

(o import de `ThemeConfig` existente vira o de cima).

Função de módulo, acima da classe:

```ts
/** só o typewriter real escolhe tinta; nos outros estilos o texto herda a cor */
function inkModeOf(config: ThemeConfig): InkMode {
  const choose = config.workspaceStyle === "typewriter-real";
  return { choose, active: choose ? config.ink : "black" };
}
```

`makeState(content: string, inkRuns: readonly InkRun[] = [])` — acrescentar ao array de extensions, depois do `grammarCompartment`:

```ts
        inkField(inkRuns, inkModeOf(this.config)),
        inkDecorations,
```

`openDocument(path: string, content: string, inkRuns: readonly InkRun[] = [])` — no ramo sem cache: `this.view.setState(this.makeState(content, inkRuns));`.

`applyConfig` — acrescentar `setInkMode.of(inkModeOf(config)),` ao array de effects.

Métodos novos (depois de `currentText()`):

```ts
  currentInkRuns(): InkRun[] {
    return inkRunsOf(this.view.state);
  }

  /** recolore a seleção; false se não há seleção */
  recolorSelection(ink: Ink): boolean {
    const spec = recolorSelectionSpec(this.view.state, ink);
    if (!spec) return false;
    this.view.dispatch(spec);
    return true;
  }
```

- [ ] **Step 8: Suite + check + commit**

Run: `npm test && npm run check`
Expected: verde, 0 erros.

```bash
git add src/infrastructure/codemirror/ink-field.ts src/infrastructure/codemirror/ink.ts src/infrastructure/codemirror/editor.ts src/ui/styles/app.css tests/infrastructure/ink-field.test.ts
git commit -m "feat(editor): trechos de tinta mapeados pela edição, com undo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Ciclo de vida do lateral no `Workspace`

**Files:**
- Modify: `src/ui/stores/workspace.svelte.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `InkStore` + `TauriInkStore` + `loadInk`/`saveInk`/`FRESH_INK_SESSION`/`InkSession` (Task 7); `CmEditor.openDocument(…, inkRuns)`, `currentInkRuns()` (Task 8).
- Produces: `WorkspaceDeps.inkStore: InkStore`; campos privados `inkSession: InkSession`, `openInkRuns: InkRun[]`; método privado `private async loadInkFor(path: string, content: string): Promise<InkRun[]>`.

- [ ] **Step 1: Deps e campos.** Imports:

```ts
import type { InkStore } from "../../application/ports/ink-store";
import {
  FRESH_INK_SESSION,
  loadInk,
  saveInk,
  type InkSession,
} from "../../application/use-cases/ink-persistence";
import type { InkRun } from "../../domain/services/ink-runs";
```

Em `WorkspaceDeps`, depois de `windowAppearance`: `inkStore: InkStore;`

Campos privados, depois de `private systemDark…`:

```ts
  private inkSession: InkSession = FRESH_INK_SESSION;
  /** trechos da nota aberta, para o editor que ainda vai montar (attachEditor) */
  private openInkRuns: InkRun[] = [];
```

- [ ] **Step 2: Carregar ao abrir.** Método novo na seção `// ── notas`:

```ts
  /** lateral de tinta da nota; falha de leitura = trata como ilegível (não sobrescreve) */
  private async loadInkFor(path: string, content: string): Promise<InkRun[]> {
    if (!this.library || this.isGuide(path)) {
      this.inkSession = FRESH_INK_SESSION;
      return [];
    }
    try {
      const { runs, session } = await loadInk(this.deps.inkStore, this.library.rootPath, path, content);
      this.inkSession = session;
      return runs;
    } catch {
      this.inkSession = { lastSaved: null, unreadable: true };
      return [];
    }
  }
```

Em `openPath`, trocar `this.editor?.openDocument(note.path, note.content);` por:

```ts
    this.openInkRuns = await this.loadInkFor(note.path, note.content);
    this.editor?.openDocument(note.path, note.content, this.openInkRuns);
```

Em `openGuide`, depois de `this.editor?.forget(GUIDE_PATH);`: `this.inkSession = FRESH_INK_SESSION; this.openInkRuns = [];`

Em `attachEditor`, trocar `editor.openDocument(this.note.path, this.note.content)` por `editor.openDocument(this.note.path, this.note.content, this.openInkRuns)`.

Em `onExternalChange`, trocar `this.editor?.openDocument(fresh.path, fresh.content);` por:

```ts
      this.openInkRuns = await this.loadInkFor(fresh.path, fresh.content);
      this.editor?.openDocument(fresh.path, fresh.content, this.openInkRuns);
```

- [ ] **Step 3: Gravar com a nota.** Em `persistCurrentNote`, capturar texto e trechos no mesmo instante — trocar `const outcome = await saveNote(this.deps.repo, note, editor.currentText());` por:

```ts
      const text = editor.currentText();
      const runs = editor.currentInkRuns();
      const outcome = await saveNote(this.deps.repo, note, text);
```

No ramo de conflito, trocar `this.editor?.openDocument(conflictNote.path, conflictNote.content);` por:

```ts
        // as cores acompanham a edição preservada no .conflict
        this.inkSession = FRESH_INK_SESSION;
        await this.persistInk(conflictNote.path, text, runs);
        this.openInkRuns = runs;
        this.editor?.openDocument(conflictNote.path, conflictNote.content, runs);
```

No ramo `else` (sucesso), depois de `this.note = outcome.note;`:

```ts
        await this.persistInk(note.path, text, runs);
```

Método novo logo depois de `persistCurrentNote`:

```ts
  /** a nota já está salva; falha aqui só perde cor, nunca texto */
  private async persistInk(path: string, text: string, runs: readonly InkRun[]): Promise<void> {
    if (!this.library) return;
    try {
      this.inkSession = await saveInk(
        this.deps.inkStore,
        this.library.rootPath,
        path,
        text,
        runs,
        this.inkSession,
      );
    } catch {
      this.showHud("cores não salvas — nova tentativa no próximo save");
    }
  }
```

- [ ] **Step 4: Acompanhar rename/move/delete.** Método utilitário (seção `// ── notas`):

```ts
  private inkFollow(op: (store: InkStore, root: string) => Promise<void>): Promise<void> {
    if (!this.library) return Promise.resolve();
    return op(this.deps.inkStore, this.library.rootPath).catch(() => {});
  }
```

Inserir, **logo depois** de cada `await this.deps.repo.rename(…)` / `await this.deps.repo.delete(…)`:
- `renameNote`: `await this.inkFollow((s, r) => s.move(r, path, to));`
- `confirmMove`: `await this.inkFollow((s, r) => s.move(r, move.srcPath, to));`
- `renameFolder`: `await this.inkFollow((s, r) => s.move(r, path, to));`
- `deleteNote`: `await this.inkFollow((s, r) => s.trash(r, path));`
- `deleteFolder`: `await this.inkFollow((s, r) => s.trash(r, path));`

- [ ] **Step 5: Composition root.** `src/main.ts`: `import { TauriInkStore } from "./infrastructure/tauri/tauri-ink-store";` e `inkStore: new TauriInkStore(),` no `new Workspace({…})`.

- [ ] **Step 6: Verificar**

Run: `npm test && npm run check`
Expected: verde, 0 erros.

A UI de escolher tinta só chega no Task 12. Para testar agora, criar o lateral à mão: com o app fechado, escrever `<biblioteca>/.ink/<nota>.md.json` com:

```json
{"version":1,"contentLength":0,"contentHash":"fnv1a:00000000","runs":[{"from":0,"to":5,"ink":"blue","text":"<5 primeiros caracteres exatos da nota>","prefix":"","suffix":""}]}
```

e conferir:
1. Abrir a nota: os 5 primeiros caracteres aparecem azuis (reancoragem, já que o hash não bate).
2. Digitar no fim deles: a cor se estende. Digitar antes: não colore.
3. Salvar (⌘S): o `.json` é regravado com o hash correto; o `.md` não contém nada além do texto (`cat` no arquivo).
4. Renomear a nota pela sidebar: o lateral vai junto (`ls <biblioteca>/.ink/`).
5. Apagar todo o trecho azul e salvar: o lateral some.
6. Excluir a nota: o lateral vai para a Lixeira.
7. Uma nota sem cor nunca cria arquivo em `.ink/`.

- [ ] **Step 7: Commit**

```bash
git add src/ui/stores/workspace.svelte.ts src/main.ts
git commit -m "feat: lateral de tinta acompanha abrir, salvar, conflito, renomear e excluir

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Fase E — Typewriter real

### Task 10: Cena, Courier Prime e carro móvel

**Files:**
- Create: `src/assets/fonts/CourierPrime-Regular.ttf`, `-Bold.ttf`, `-Italic.ttf`, `-BoldItalic.ttf`
- Modify: `src/ui/styles/fonts.css`, `README.md` (seção Fontes)
- Create: `src/domain/services/carriage.ts`
- Test: `tests/domain/carriage.test.ts`
- Create: `src/infrastructure/codemirror/real-typewriter.ts`
- Create: `src/ui/styles/style-typewriter-real.css`
- Modify: `src/infrastructure/codemirror/editor.ts`, `src/infrastructure/codemirror/ia-writer-theme.ts`, `src/main.ts`, `src/ui/stores/workspace.svelte.ts`

**Interfaces:**
- Consumes: `styleModeCompartment`/`styleExtension` (Task 6).
- Produces:
  ```ts
  // domain/services/carriage.ts
  export type CarriageEvent = "key" | "space" | "backspace" | "return" | "bell" | "linefeed";
  export interface CaretSnapshot { line: number; col: number }
  export type CarriageAction = "insert" | "delete" | "move";
  export const BELL_COLUMN = 59;
  export function carriageEvents(input: { action: CarriageAction; text: string; prev: CaretSnapshot; next: CaretSnapshot; bellRung: boolean }): { events: CarriageEvent[]; bellRung: boolean }
  // real-typewriter.ts
  export interface TypewriterHooks { onEvents(events: CarriageEvent[]): void }
  export function realTypewriter(hooks: TypewriterHooks, wear: number): Extension
  // EditorEvents
  onCarriage?(events: CarriageEvent[]): void
  ```
  `CaretSnapshot.line` = topo da linha visual em px (arredondado); `col` = caracteres desde o início da linha visual.

- [ ] **Step 1: Fonte.**

```bash
for f in Regular Bold Italic BoldItalic; do
  curl -fsSL -o "src/assets/fonts/CourierPrime-$f.ttf" "https://raw.githubusercontent.com/google/fonts/main/ofl/courierprime/CourierPrime-$f.ttf"
done
ls -la src/assets/fonts/CourierPrime-*
```

Expected: 4 arquivos de ~40–80 KB.

Acrescentar ao fim de `src/ui/styles/fonts.css`:

```css
/* Courier Prime — SIL OFL; fonte da máquina de escrever (estilo typewriter real) */
@font-face {
  font-family: "Courier Prime";
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  src: url("../../assets/fonts/CourierPrime-Regular.ttf") format("truetype");
}
@font-face {
  font-family: "Courier Prime";
  font-weight: 700;
  font-style: normal;
  font-display: swap;
  src: url("../../assets/fonts/CourierPrime-Bold.ttf") format("truetype");
}
@font-face {
  font-family: "Courier Prime";
  font-weight: 400;
  font-style: italic;
  font-display: swap;
  src: url("../../assets/fonts/CourierPrime-Italic.ttf") format("truetype");
}
@font-face {
  font-family: "Courier Prime";
  font-weight: 700;
  font-style: italic;
  font-display: swap;
  src: url("../../assets/fonts/CourierPrime-BoldItalic.ttf") format("truetype");
}
```

Em `README.md`, na lista "## Fontes", acrescentar: `- **Courier Prime** — SIL OFL; fonte do estilo máquina de escrever (⌘E).`

- [ ] **Step 2: Testes que falham** — `tests/domain/carriage.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { BELL_COLUMN, carriageEvents } from "../../src/domain/services/carriage";

const at = (line: number, col: number) => ({ line, col });

describe("carriageEvents", () => {
  it("letra na mesma linha = tecla", () => {
    expect(
      carriageEvents({ action: "insert", text: "a", prev: at(0, 3), next: at(0, 4), bellRung: false }),
    ).toEqual({ events: ["key"], bellRung: false });
  });

  it("espaço tem som próprio", () => {
    expect(
      carriageEvents({ action: "insert", text: " ", prev: at(0, 3), next: at(0, 4), bellRung: false })
        .events,
    ).toEqual(["space"]);
  });

  it("Enter = retorno do carro + avanço de linha, sem tecla", () => {
    expect(
      carriageEvents({ action: "insert", text: "\n", prev: at(0, 20), next: at(28, 0), bellRung: true }),
    ).toEqual({ events: ["return", "linefeed"], bellRung: false });
  });

  it("quebra automática = tecla + retorno + avanço", () => {
    expect(
      carriageEvents({ action: "insert", text: "x", prev: at(0, 65), next: at(28, 1), bellRung: true })
        .events,
    ).toEqual(["key", "return", "linefeed"]);
  });

  it("ding uma vez por linha ao cruzar a coluna do sino", () => {
    const first = carriageEvents({
      action: "insert",
      text: "a",
      prev: at(0, BELL_COLUMN - 1),
      next: at(0, BELL_COLUMN),
      bellRung: false,
    });
    expect(first).toEqual({ events: ["key", "bell"], bellRung: true });
    const second = carriageEvents({
      action: "insert",
      text: "a",
      prev: at(0, BELL_COLUMN),
      next: at(0, BELL_COLUMN + 1),
      bellRung: true,
    });
    expect(second.events).toEqual(["key"]);
  });

  it("backspace = recuo", () => {
    expect(
      carriageEvents({ action: "delete", text: "", prev: at(0, 5), next: at(0, 4), bellRung: true }),
    ).toEqual({ events: ["backspace"], bellRung: true });
  });

  it("mover o cursor não faz som; mudar de linha rearma o sino", () => {
    expect(
      carriageEvents({ action: "move", text: "", prev: at(0, 60), next: at(56, 2), bellRung: true }),
    ).toEqual({ events: [], bellRung: false });
    expect(
      carriageEvents({ action: "move", text: "", prev: at(0, 60), next: at(0, 2), bellRung: true }),
    ).toEqual({ events: [], bellRung: true });
  });

  it("colar várias letras = uma tecla", () => {
    expect(
      carriageEvents({ action: "insert", text: "abc", prev: at(0, 1), next: at(0, 4), bellRung: false })
        .events,
    ).toEqual(["key"]);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run tests/domain/carriage.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 4: Implementar** — `src/domain/services/carriage.ts`:

```ts
/**
 * Eventos mecânicos da máquina de escrever a partir de uma edição: o que
 * soa e o que anima. Puro — a camada de editor mede o cursor e chama.
 */
export type CarriageEvent = "key" | "space" | "backspace" | "return" | "bell" | "linefeed";

export interface CaretSnapshot {
  /** topo da linha visual (px, arredondado) — identidade da linha */
  line: number;
  /** caracteres desde o início da linha visual */
  col: number;
}

export type CarriageAction = "insert" | "delete" | "move";

/** coluna 65 menos 6: o sino avisa que a margem está chegando */
export const BELL_COLUMN = 59;

export function carriageEvents(input: {
  action: CarriageAction;
  text: string;
  prev: CaretSnapshot;
  next: CaretSnapshot;
  bellRung: boolean;
}): { events: CarriageEvent[]; bellRung: boolean } {
  const { action, text, prev, next } = input;
  const lineChanged = next.line !== prev.line;
  let bellRung = lineChanged ? false : input.bellRung;
  const events: CarriageEvent[] = [];

  if (action === "move") return { events, bellRung };
  if (action === "delete") return { events: ["backspace"], bellRung };

  if (text.includes("\n")) {
    events.push("return", "linefeed");
  } else {
    events.push(text === " " ? "space" : "key");
    if (lineChanged) events.push("return", "linefeed");
  }
  if (!bellRung && next.col >= BELL_COLUMN) {
    events.push("bell");
    bellRung = true;
  }
  return { events, bellRung };
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run tests/domain/carriage.test.ts`
Expected: PASS.

- [ ] **Step 6: Extensão do carro** — `src/infrastructure/codemirror/real-typewriter.ts`:

```ts
import { EditorSelection, type Extension } from "@codemirror/state";
import { EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import {
  carriageEvents,
  type CarriageAction,
  type CarriageEvent,
  type CaretSnapshot,
} from "../../domain/services/carriage";

export interface TypewriterHooks {
  onEvents(events: CarriageEvent[]): void;
}

/** linha de batida: fração da altura visível */
const STRIKE_LINE = 0.65;
const ESCAPE_MS = 40;
const RETURN_MS = 280;
const MOVE_MS = 200;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface CaretMeasure {
  snapshot: CaretSnapshot;
  /** x do cursor dentro do scroller (independe do translate) */
  x: number;
  /** y do cursor relativo ao topo visível do scroller */
  y: number;
  viewHeight: number;
  editorWidth: number;
}

/**
 * Carro móvel: o scroller inteiro (texto + layers de cursor/seleção) é
 * transladado em X para que o ponto de batida fique no centro da janela —
 * a folha anda, não o cursor. Transladar o scroller (e não o contentDOM)
 * mantém cursor e seleção alinhados durante a transição.
 * Em Y, ancora a linha do cursor a 65% da altura, só em eventos do usuário.
 */
function carriagePlugin(hooks: TypewriterHooks) {
  return ViewPlugin.fromClass(
    class {
      private prev: CaretSnapshot | null = null;
      private bellRung = false;
      private pending: { action: CarriageAction | null; text: string } = { action: null, text: "" };

      constructor(readonly view: EditorView) {
        this.schedule();
      }

      update(u: ViewUpdate) {
        for (const tr of u.transactions) {
          if (tr.isUserEvent("input")) {
            this.pending.action = "insert";
            tr.changes.iterChanges((_a, _b, _c, _d, inserted) => {
              this.pending.text += inserted.toString();
            });
          } else if (tr.isUserEvent("delete")) {
            if (this.pending.action !== "insert") this.pending.action = "delete";
          } else if ((tr.isUserEvent("select") || tr.isUserEvent("move")) && !this.pending.action) {
            this.pending.action = "move";
          }
        }
        if (u.docChanged || u.selectionSet || u.geometryChanged) this.schedule();
      }

      private schedule() {
        this.view.requestMeasure({
          key: this,
          read: (v): CaretMeasure | null => {
            const head = v.state.selection.main.head;
            const coords = v.coordsAtPos(head);
            if (!coords) return null;
            const lineStart = v.moveToLineBoundary(EditorSelection.cursor(head), false).head;
            const scroller = v.scrollDOM.getBoundingClientRect();
            return {
              snapshot: {
                line: Math.round(coords.top - scroller.top + v.scrollDOM.scrollTop),
                col: head - lineStart,
              },
              x: coords.left - scroller.left,
              y: coords.top - scroller.top,
              viewHeight: v.scrollDOM.clientHeight,
              editorWidth: v.dom.getBoundingClientRect().width,
            };
          },
          write: (m, v) => {
            const { action, text } = this.pending;
            this.pending = { action: null, text: "" };
            if (!m) return;

            let events: CarriageEvent[] = [];
            if (action && this.prev) {
              const r = carriageEvents({ action, text, prev: this.prev, next: m.snapshot, bellRung: this.bellRung });
              events = r.events;
              this.bellRung = r.bellRung;
              if (events.length) hooks.onEvents(events);
            }
            this.prev = m.snapshot;

            const reduce = reducedMotion();
            const isReturn = events.includes("return");
            const ms = isReturn ? RETURN_MS : action === "move" ? MOVE_MS : ESCAPE_MS;
            const ease = isReturn ? "cubic-bezier(0.2, 0.8, 0.2, 1)" : "linear";
            v.scrollDOM.style.transition = reduce || !action ? "none" : `transform ${ms}ms ${ease}`;
            v.scrollDOM.style.transform = `translateX(${Math.round(m.editorWidth / 2 - m.x)}px)`;

            if (action) {
              const target = v.scrollDOM.scrollTop + m.y - m.viewHeight * STRIKE_LINE;
              if (Math.abs(target - v.scrollDOM.scrollTop) > 1) {
                v.scrollDOM.scrollTo({ top: target, behavior: reduce ? "auto" : "smooth" });
              }
            }
          },
        });
      }

      destroy() {
        this.view.scrollDOM.style.transform = "";
        this.view.scrollDOM.style.transition = "";
      }
    },
  );
}

export function realTypewriter(hooks: TypewriterHooks, _wear: number): Extension {
  return [EditorView.editorAttributes.of({ class: "tinta-tw-real" }), carriagePlugin(hooks)];
}
```

(`_wear` passa a ser usado no Task 11.)

- [ ] **Step 7: Tema do editor.** Em `src/infrastructure/codemirror/ia-writer-theme.ts`:

Depois de `markdownHighlight`, acrescentar um highlighter só de classes (o CSS do typewriter real precisa de alvos estáveis):

```ts
/** classes estáveis por token — alvo de CSS dos estilos (ex.: dupla batida no typewriter real) */
const tokenClasses = HighlightStyle.define([
  { tag: tags.strong, class: "tok-strong" },
  { tag: tags.emphasis, class: "tok-em" },
  {
    tag: [tags.heading1, tags.heading2, tags.heading3, tags.heading4, tags.heading5, tags.heading6],
    class: "tok-heading",
  },
]);

const TYPEWRITER_FONT = "'Courier Prime', 'Courier New', ui-monospace, monospace";
```

Em `buildTheme`, no início da função:

```ts
  const realTypewriter = config.workspaceStyle === "typewriter-real";
```

e trocar, dentro do tema:
- `fontFamily: fontStack(config.editorFont),` → `fontFamily: realTypewriter ? TYPEWRITER_FONT : fontStack(config.editorFont),`
- `maxWidth: \`${config.columnWidth}ch\`,` → `maxWidth: realTypewriter ? "65ch" : \`${config.columnWidth}ch\`,`
- `textAlign: config.justified ? "justify" : "left",` → `textAlign: config.justified && !realTypewriter ? "justify" : "left",`
- nas duas linhas de `hyphens`, trocar `config.justified` por `config.justified && !realTypewriter`.

E no array de retorno, depois de `syntaxHighlighting(markdownHighlight),`: `syntaxHighlighting(tokenClasses),`.

- [ ] **Step 8: Editor.** Em `src/infrastructure/codemirror/editor.ts`:

Imports: `import type { CarriageEvent } from "../../domain/services/carriage";` e `import { realTypewriter } from "./real-typewriter";`.

Em `EditorEvents`: `onCarriage?(events: CarriageEvent[]): void;`

Função de módulo (ao lado de `inkModeOf`):

```ts
/** no typewriter real, foco e typewriter scrolling ficam suspensos (não alterados) */
function effectiveConfig(config: ThemeConfig): ThemeConfig {
  return config.workspaceStyle === "typewriter-real"
    ? { ...config, focusMode: "off", typewriter: false }
    : config;
}
```

Em `makeState` e em `applyConfig`, nas linhas do `focusCompartment` e do `typewriterCompartment`, usar `effectiveConfig(…)` em vez do config direto:
- `focusMode(effectiveConfig(this.config).focusMode)` / `effectiveConfig(this.config).typewriter ? typewriter() : []` em `makeState`;
- `focusMode(effectiveConfig(config).focusMode)` / `effectiveConfig(config).typewriter ? typewriter() : []` em `applyConfig`.

Em `styleExtension`, acrescentar o caso:

```ts
      case "typewriter-real":
        return realTypewriter({ onEvents: (e) => this.events.onCarriage?.(e) }, config.inkWear);
```

- [ ] **Step 9: CSS da cena** — `src/ui/styles/style-typewriter-real.css`:

```css
/* ─────────────────────────────────────────────────────────────────
   estilo máquina de escrever — a tela é a folha; o papel sai de baixo
   (do teclado) e sobe. Sempre papel claro, independente do tema.
   ─────────────────────────────────────────────────────────────── */

:root[data-style="typewriter-real"],
:root[data-style="typewriter-real"][data-theme="dark"] {
  color-scheme: light;
  --tinta-paper: #f6f1e7;
  --tinta-editor-fg: #1d1c1a;
  --tinta-ink-blue: #1f3a93;
  --tinta-ink-red: #a3231f;
  --tinta-dim: rgba(29, 28, 26, 0.45);
  --tinta-selection: rgba(183, 186, 175, 0.55);
  --tinta-accent: var(--tinta-editor-fg);
}

:root[data-style="typewriter-real"][data-ink="blue"] { --tinta-accent: var(--tinta-ink-blue); }
:root[data-style="typewriter-real"][data-ink="red"] { --tinta-accent: var(--tinta-ink-red); }

:root[data-style="typewriter-real"] body {
  background: var(--tinta-paper);
}

.tinta-tw-real.cm-editor {
  background: var(--tinta-paper);
  overflow: hidden;
  animation: tw-feed 600ms var(--ab-ease) both;
}

/* fibra do papel: ruído SVG inline, acompanha a folha (attachment local) */
.tinta-tw-real .cm-scroller {
  background-color: var(--tinta-paper);
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.22  0 0 0 0.07 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  background-attachment: local;
  scrollbar-width: none;
}

.tinta-tw-real .cm-scroller::-webkit-scrollbar {
  display: none;
}

/* folga para a primeira linha poder ficar na linha de batida (65%) */
.tinta-tw-real .cm-content {
  padding-top: 65vh !important;
  padding-bottom: 35vh !important;
}

/* o papel curva em volta do rolo logo abaixo da linha de batida */
.tinta-tw-real.cm-editor::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: calc(65% + 1.9em);
  bottom: 0;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    rgba(60, 45, 25, 0) 0%,
    rgba(60, 45, 25, 0.08) 35%,
    rgba(30, 22, 12, 0.22) 100%
  );
}

/* uma máquina tem um corpo só */
.tinta-tw-real .cm-content .tok-heading {
  font-size: inherit !important;
  line-height: inherit !important;
}

/* negrito = dupla batida; consumido pelo desgaste da tinta (Task 11) */
.tinta-tw-real .cm-content .tok-strong {
  font-weight: 400 !important;
  --tw-bold-shadow: 0.5px 0 0 currentColor;
  text-shadow: var(--tw-bold-shadow);
}

/* itálico = sublinhado, como se fazia na máquina */
.tinta-tw-real .cm-content .tok-em {
  font-style: normal !important;
  text-decoration: underline;
  text-underline-offset: 3px;
}

@keyframes tw-feed {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tinta-tw-real.cm-editor {
    animation: none;
  }
}
```

`src/main.ts`: `import "./ui/styles/style-typewriter-real.css";` depois do `style-paper.css`.

- [ ] **Step 10: Workspace — `data-ink`.** Em `applyThemeToDom()`, depois de `root.dataset.style = …`: `root.dataset.ink = this.theme.ink;`

- [ ] **Step 11: Verificar**

Run: `npm test && npm run check`
Expected: verde, 0 erros.

Run: `npm run tauri dev` e conferir no estilo `máquina de escrever`:
1. Folha creme com fibra sutil sobe de baixo ao entrar (~600 ms); chrome escondido.
2. Courier Prime, coluna de 65 caracteres, headings no mesmo corpo, `**negrito**` com dupla batida, `*itálico*` sublinhado.
3. O ponto de digitação fica fixo no centro horizontal; a folha anda para a esquerda a cada letra.
4. Enter: a folha volta (~280 ms) e a linha sobe; a linha de batida fica a ~65% da altura.
5. Quebra automática no fim da linha: mesmo retorno.
6. Clique em outra parte do texto: o carro vai até lá (sem saltos bruscos).
7. Abaixo da linha de batida, o papel escurece levemente (rolo).
8. Tema escuro do sistema: a folha continua clara.
9. Com "Reduzir movimento" ligado nos Ajustes do macOS: sem transições.
10. ⌘E para `transparência`: transform do scroller zerado, layout normal.

- [ ] **Step 12: Commit**

```bash
git add src/assets/fonts/CourierPrime-*.ttf src/ui/styles/fonts.css README.md src/domain/services/carriage.ts tests/domain/carriage.test.ts src/infrastructure/codemirror/real-typewriter.ts src/infrastructure/codemirror/ia-writer-theme.ts src/infrastructure/codemirror/editor.ts src/ui/styles/style-typewriter-real.css src/main.ts src/ui/stores/workspace.svelte.ts
git commit -m "feat: máquina de escrever — folha, Courier Prime e carro móvel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Desgaste da tinta, batida e tranco

**Files:**
- Create: `src/domain/services/ink-wear.ts`
- Test: `tests/domain/ink-wear.test.ts`
- Modify: `src/infrastructure/codemirror/real-typewriter.ts`
- Modify: `src/ui/styles/style-typewriter-real.css`

**Interfaces:**
- Consumes: `realTypewriter(hooks, wear)` (Task 10); `styleKeyOf` reconfigura ao mudar `inkWear` (Task 6).
- Produces:
  ```ts
  export interface WearStyle { opacity: number; dy: number; rot: number; bleed: number; faint: boolean }
  export function wearFor(code: number, context: string, wear: number): WearStyle | null
  ```
  `context` = até 3 caracteres anteriores (mesma linha do doc).

- [ ] **Step 1: Testes que falham** — `tests/domain/ink-wear.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { wearFor } from "../../src/domain/services/ink-wear";

const A = "a".charCodeAt(0);

describe("wearFor", () => {
  it("desgaste zero = tinta limpa", () => {
    expect(wearFor(A, "cas", 0)).toBeNull();
  });

  it("determinístico: mesma letra no mesmo contexto é sempre igual", () => {
    expect(wearFor(A, "cas", 0.5)).toEqual(wearFor(A, "cas", 0.5));
  });

  it("contexto diferente muda o desgaste", () => {
    const samples = ["cas", "mes", "vid", "pal", "lum"].map((c) => wearFor(A, c, 1)!.opacity);
    expect(new Set(samples).size).toBeGreaterThan(1);
  });

  it("faixas no desgaste máximo", () => {
    for (let i = 0; i < 500; i++) {
      const w = wearFor(32 + (i % 90), String(i), 1)!;
      expect(w.opacity).toBeGreaterThanOrEqual(0.78);
      expect(w.opacity).toBeLessThanOrEqual(1);
      expect(Math.abs(w.dy)).toBeLessThanOrEqual(0.6);
      expect(Math.abs(w.rot)).toBeLessThanOrEqual(1.2);
    }
  });

  it("~5% de batidas fracas no desgaste padrão (0.5)", () => {
    let faint = 0;
    for (let i = 0; i < 4000; i++) if (wearFor(97 + (i % 26), String(i), 0.5)!.faint) faint++;
    expect(faint / 4000).toBeGreaterThan(0.03);
    expect(faint / 4000).toBeLessThan(0.07);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/domain/ink-wear.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar** — `src/domain/services/ink-wear.ts`:

```ts
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/domain/ink-wear.test.ts`
Expected: PASS.

- [ ] **Step 5: Decorações de desgaste + batida + tranco.** Em `src/infrastructure/codemirror/real-typewriter.ts`:

Imports adicionais:

```ts
import { type Range, StateEffect, StateField } from "@codemirror/state";
import { Decoration, type DecorationSet } from "@codemirror/view";
import { wearFor } from "../../domain/services/ink-wear";
```

(juntar com os imports existentes de `@codemirror/state` e `@codemirror/view`.)

Acrescentar antes de `realTypewriter`:

```ts
const isSpaceChar = (ch: string) => ch === " " || ch === "\t";

/**
 * Uma mark por caractere, só nas visibleRanges. Palavras viram nowrap
 * para que as letras possam ser inline-block (rotação) sem quebrar no meio.
 * As palavras vão por outerDecorations: no CodeMirror, precedência maior =
 * nó DOM mais interno, e a palavra precisa ENVOLVER as letras.
 */
function wearPlugin(wear: number) {
  const word = Decoration.mark({ class: "tw-word" });
  const plugin = ViewPlugin.fromClass(
    class {
      chars: DecorationSet = Decoration.none;
      words: DecorationSet = Decoration.none;
      constructor(view: EditorView) {
        this.build(view);
      }
      update(u: ViewUpdate) {
        if (u.docChanged || u.viewportChanged) this.build(u.view);
      }
      build(view: EditorView): void {
        if (wear <= 0) {
          this.chars = this.words = Decoration.none;
          return;
        }
        const out: Range<Decoration>[] = [];
        const words: Range<Decoration>[] = [];
        for (const { from, to } of view.visibleRanges) {
          for (let pos = from; pos <= to; ) {
            const line = view.state.doc.lineAt(pos);
            const end = Math.min(line.to, to);
            const text = line.text;
            let wordStart = -1;
            for (let p = pos; p < end; p++) {
              const i = p - line.from;
              const ch = text[i]!;
              if (isSpaceChar(ch)) {
                if (wordStart >= 0) words.push(word.range(wordStart, p));
                wordStart = -1;
                continue;
              }
              if (wordStart < 0) wordStart = p;
              const w = wearFor(ch.charCodeAt(0), text.slice(Math.max(0, i - 3), i), wear)!;
              out.push(
                Decoration.mark({
                  class: w.faint ? "tw-ch tw-faint" : "tw-ch",
                  attributes: {
                    style: `--o:${w.opacity.toFixed(3)};--dy:${w.dy.toFixed(2)}px;--r:${w.rot.toFixed(2)}deg;--bleed:${w.bleed.toFixed(2)}px`,
                  },
                }).range(p, p + 1),
              );
            }
            if (wordStart >= 0) words.push(word.range(wordStart, end));
            pos = line.to + 1;
          }
        }
        this.chars = Decoration.set(out, true);
        this.words = Decoration.set(words, true);
      }
    },
    { decorations: (v) => v.chars },
  );
  return [
    plugin,
    EditorView.outerDecorations.of((view) => view.plugin(plugin)?.words ?? Decoration.none),
  ];
}

/** letra recém-batida: classe por ~80 ms para a animação de impacto */
const addStrike = StateEffect.define<{ from: number; to: number }>();
const clearStrike = StateEffect.define<null>();
const strikeMark = Decoration.mark({ class: "tw-strike" });

const strikeField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    let deco = value.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(clearStrike)) deco = Decoration.none;
      if (e.is(addStrike) && e.value.to > e.value.from)
        deco = Decoration.set([strikeMark.range(e.value.from, e.value.to)]);
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const strikeOnInput = EditorView.updateListener.of((u) => {
  const typed = u.transactions.some((t) => t.isUserEvent("input.type"));
  if (!typed) return;
  let range: { from: number; to: number } | null = null;
  u.changes.iterChanges((_a, _b, fromB, toB) => {
    if (toB > fromB) range = { from: fromB, to: toB };
  });
  if (!range) return;
  const view = u.view;
  // dispatch dentro de um update é proibido — agenda
  requestAnimationFrame(() => {
    view.dispatch({ effects: addStrike.of(range!) });
    setTimeout(() => view.dispatch({ effects: clearStrike.of(null) }), 80);
  });
});

/** tranco de 1 px na folha a cada batida */
function jolt(dom: HTMLElement) {
  dom.classList.remove("tw-jolt");
  void dom.offsetWidth; // reinicia a animação
  dom.classList.add("tw-jolt");
}
```

No `write` do `carriagePlugin`, logo depois de `if (events.length) hooks.onEvents(events);`:

```ts
              if (events.includes("key") || events.includes("space")) jolt(v.dom);
```

Trocar `realTypewriter` por:

```ts
export function realTypewriter(hooks: TypewriterHooks, wear: number): Extension {
  return [
    EditorView.editorAttributes.of({ class: "tinta-tw-real" }),
    carriagePlugin(hooks),
    wearPlugin(wear),
    strikeField,
    strikeOnInput,
  ];
}
```

Mudar o `inkWear` no painel reconfigura a extensão sozinho: a chave `styleKeyOf` do Task 6 já inclui o desgaste.

- [ ] **Step 6: CSS.** Acrescentar ao fim de `src/ui/styles/style-typewriter-real.css`:

```css
/* desgaste da tinta (vars por caractere vêm do plugin) */
.tinta-tw-real .tw-word {
  white-space: nowrap;
}

.tinta-tw-real .tw-ch {
  display: inline-block;
  opacity: var(--o, 1);
  transform: translateY(var(--dy, 0)) rotate(var(--r, 0));
  text-shadow:
    var(--tw-bold-shadow, 0 0 0 transparent),
    0 0 var(--bleed, 0) currentColor;
}

/* batida fraca: a metade de baixo da letra mais clara */
.tinta-tw-real .tw-faint {
  background: linear-gradient(
    to bottom,
    currentColor 55%,
    color-mix(in srgb, currentColor 45%, transparent) 55%
  );
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* impacto da tecla */
.tinta-tw-real .tw-strike .tw-ch,
.tinta-tw-real .tw-strike {
  animation: tw-strike 60ms ease-out;
}

@keyframes tw-strike {
  from {
    opacity: 0.4;
    transform: translateY(var(--dy, 0)) rotate(var(--r, 0)) scale(1.08);
  }
}

.tinta-tw-real.tw-jolt {
  animation: tw-jolt 70ms ease-out;
}

@keyframes tw-jolt {
  50% {
    transform: translateY(1px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tinta-tw-real .tw-strike,
  .tinta-tw-real .tw-strike .tw-ch,
  .tinta-tw-real.tw-jolt {
    animation: none;
  }
}
```

- [ ] **Step 7: Verificar**

Run: `npm test && npm run check`
Expected: verde, 0 erros.

Run: `npm run tauri dev` no estilo `máquina de escrever`:
1. Letras com leve variação de intensidade, altura e rotação; algumas mais claras embaixo.
2. Digitar no fim de uma linha não altera as letras anteriores; editar no meio só altera as 3 letras seguintes.
3. Palavras nunca quebram no meio por causa das letras inline-block.
4. Cada letra nova "pousa" (impacto curto) e a folha dá um tranco mínimo.
5. Acentos via tecla morta (´ + a → á) funcionam normalmente.
6. Nota longa (colar ~50 mil palavras): rolagem e digitação seguem fluidas.
7. Mudar `inkWear` para 0 (temporariamente via `settings.json` ou via Task 12): texto limpo.

- [ ] **Step 8: Commit**

```bash
git add src/domain/services/ink-wear.ts tests/domain/ink-wear.test.ts src/infrastructure/codemirror/real-typewriter.ts src/ui/styles/style-typewriter-real.css
git commit -m "feat: desgaste da tinta, impacto da tecla e tranco da folha

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Fita de tinta, ⌘⇧I e painel mínimo

**Files:**
- Create: `src/ui/InkRibbon.svelte`
- Create: `src/ui/TypewriterControls.svelte`
- Modify: `src/ui/stores/workspace.svelte.ts`, `src/ui/App.svelte`, `src/ui/StatusBar.svelte`

**Interfaces:**
- Consumes: `nextInk`, `INKS`, `type Ink` (Task 1); `CmEditor.recolorSelection` (Task 8).
- Produces: `export const INK_LABELS: Record<Ink, string>`; `Workspace.cycleInk(): void`; `Workspace.chooseInk(ink: Ink): void`.

- [ ] **Step 1: Workspace.** Import `nextInk` e `type Ink` no import do theme-config. Abaixo de `WORKSPACE_STYLE_LABELS`:

```ts
export const INK_LABELS: Record<Ink, string> = { black: "preta", blue: "azul", red: "vermelha" };
```

Métodos depois de `cycleWorkspaceStyle()`:

```ts
  /** ⌘⇧I — próxima tinta; com seleção, recolore só o trecho */
  cycleInk(): void {
    this.chooseInk(nextInk(this.theme.ink));
  }

  chooseInk(ink: Ink): void {
    if (!this.isRealTypewriter) return;
    const recolored = this.editor?.recolorSelection(ink) ?? false;
    this.updateTheme({ ink });
    this.editor?.focus();
    this.showHud(`${recolored ? "trecho" : "tinta"}: ${INK_LABELS[ink]}`);
  }
```

`recolorSelection` despacha uma transação sem mudança de texto; o `onDocChanged` não roda, então marcar o autosave manualmente: dentro de `chooseInk`, depois do `recolorSelection`, acrescentar `if (recolored) this.markInkDirty();` e o método:

```ts
  /** recolorir não muda o texto, mas o lateral precisa ser gravado */
  private markInkDirty(): void {
    if (!this.note || this.isGuide(this.note.path)) return;
    this.saveState = "pending";
    this.autosave.markDirty();
  }
```

- [ ] **Step 2: Fita** — `src/ui/InkRibbon.svelte`:

```svelte
<script lang="ts">
  import { INKS } from "../domain/entities/theme-config";
  import { INK_LABELS, type Workspace } from "./stores/workspace.svelte";

  let { workspace }: { workspace: Workspace } = $props();
</script>

<!-- mousedown sem default: o editor não perde foco nem seleção -->
<div class="ribbon" role="toolbar" aria-label="tinta">
  {#each INKS as ink (ink)}
    <button
      class="dot"
      class:on={workspace.theme.ink === ink}
      data-ink={ink}
      title={`tinta ${INK_LABELS[ink]} — ⌘⇧I`}
      aria-label={`tinta ${INK_LABELS[ink]}`}
      onmousedown={(e) => e.preventDefault()}
      onclick={() => workspace.chooseInk(ink)}
    ></button>
  {/each}
</div>

<style>
  .ribbon {
    position: absolute;
    right: var(--ab-space-4);
    bottom: var(--ab-space-4);
    display: flex;
    gap: var(--ab-space-2);
    z-index: 5;
  }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: var(--ab-radius-pill);
    border: 1.5px solid var(--c);
    background: transparent;
    opacity: 0.7;
    transition: opacity var(--ab-dur-fast) var(--ab-ease-quick);
  }

  .dot:hover {
    opacity: 1;
  }

  .dot.on {
    background: var(--c);
    opacity: 1;
  }

  .dot[data-ink="black"] { --c: var(--tinta-editor-fg); }
  .dot[data-ink="blue"] { --c: var(--tinta-ink-blue); }
  .dot[data-ink="red"] { --c: var(--tinta-ink-red); }
</style>
```

- [ ] **Step 3: Painel mínimo** — `src/ui/TypewriterControls.svelte`:

```svelte
<script lang="ts">
  import { INKS } from "../domain/entities/theme-config";
  import { INK_LABELS, type Workspace } from "./stores/workspace.svelte";

  let { workspace }: { workspace: Workspace } = $props();
  const theme = $derived(workspace.theme);
</script>

<aside class="controls">
  <div class="head">
    <span class="eyebrow">máquina de escrever</span>
    <button class="close" onclick={() => (workspace.settingsOpen = false)}>fechar</button>
  </div>

  <p class="eyebrow label">tinta — ⌘⇧I</p>
  <div class="segmented">
    {#each INKS as ink (ink)}
      <button class:on={theme.ink === ink} onclick={() => workspace.chooseInk(ink)}>
        {INK_LABELS[ink]}
      </button>
    {/each}
  </div>

  <p class="eyebrow label">sons</p>
  <div class="segmented">
    <button class:on={!theme.typewriterSound} onclick={() => workspace.updateTheme({ typewriterSound: false })}>off</button>
    <button class:on={theme.typewriterSound} onclick={() => workspace.updateTheme({ typewriterSound: true })}>on</button>
  </div>

  {#if theme.typewriterSound}
    <p class="eyebrow label">volume — {Math.round(theme.typewriterVolume * 100)}%</p>
    <input
      type="range"
      min="0"
      max="1"
      step="0.05"
      value={theme.typewriterVolume}
      oninput={(e) => workspace.updateTheme({ typewriterVolume: Number(e.currentTarget.value) })}
    />
  {/if}

  <p class="eyebrow label">desgaste da tinta — {Math.round(theme.inkWear * 100)}%</p>
  <input
    type="range"
    min="0"
    max="1"
    step="0.05"
    value={theme.inkWear}
    oninput={(e) => workspace.updateTheme({ inkWear: Number(e.currentTarget.value) })}
  />

  <p class="note">⌘E troca o estilo · selecione um trecho e escolha a tinta para recolorir</p>
</aside>

<style>
  .controls {
    position: absolute;
    top: 48px;
    right: var(--ab-space-4);
    width: 240px;
    padding: var(--ab-space-3);
    background: var(--tinta-paper);
    border: 1px solid rgba(29, 28, 26, 0.18);
    color: var(--tinta-editor-fg);
    z-index: 6;
    display: flex;
    flex-direction: column;
    gap: var(--ab-space-2);
  }

  .controls :global(.eyebrow) {
    color: inherit;
  }

  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--ab-space-2);
  }

  .close,
  .label,
  .note {
    font-size: var(--ab-size-eyebrow);
    letter-spacing: var(--ab-tracking-wide);
    opacity: 0.7;
  }

  .close {
    text-transform: uppercase;
  }

  .label {
    margin-top: var(--ab-space-2);
  }

  .note {
    margin-top: var(--ab-space-3);
    line-height: var(--ab-leading-body);
  }

  .segmented {
    display: flex;
    border: 1px solid rgba(29, 28, 26, 0.18);
  }

  .segmented button {
    flex: 1;
    padding: 6px 4px;
    font-size: var(--ab-size-eyebrow);
    letter-spacing: var(--ab-tracking-wide);
    text-transform: uppercase;
  }

  .segmented button.on {
    background: var(--tinta-editor-fg);
    color: var(--tinta-paper);
  }

  input[type="range"] {
    width: 100%;
    accent-color: var(--tinta-editor-fg);
    border: none;
    padding: 0;
  }
</style>
```

- [ ] **Step 4: App.** Em `src/ui/App.svelte`, importar `InkRibbon` e `TypewriterControls`. Em `onKeydown`, antes do `} else if (key === "s" && e.shiftKey) {`:

```ts
    } else if (key === "i" && e.shiftKey) {
      e.preventDefault();
      workspace.cycleInk();
```

**Ordem importa:** o ramo `key === "f" && e.shiftKey` é o primeiro do `if`; inserir o de `i` logo depois dele, como `else if`.

No template, dentro de `<main class="editor-area">`, depois do bloco `{#if workspace.pendingMove}…{/if}`:

```svelte
      {#if workspace.isRealTypewriter && workspace.note}
        <InkRibbon {workspace} />
        {#if workspace.settingsOpen}
          <TypewriterControls {workspace} />
        {/if}
      {/if}
```

- [ ] **Step 5: Status bar.** No popover, depois de `["⌘E", "estilo do workspace"]`: `["⌘⇧I", "tinta (máquina de escrever)"]`.

- [ ] **Step 6: Verificar**

Run: `npm test && npm run check`
Expected: verde, 0 erros.

Run: `npm run tauri dev`, nota da biblioteca, estilo `máquina de escrever`:
1. Três pontos no canto inferior direito; o ativo cheio.
2. Clicar no azul: HUD `tinta: azul`, cursor fica azul, o que digito sai azul.
3. ⌘⇧I: vermelho; de novo: preto. O texto já escrito mantém a cor.
4. Selecionar um trecho e clicar no vermelho: só o trecho fica vermelho (HUD `trecho: vermelha`); ⌘Z desfaz a recoloração.
5. ⌘S e `cat` da nota: só texto. `.ink/<nota>.md.json` contém os trechos.
6. Fechar e reabrir o app: cores voltam. ⌘E para `padrão`: o texto colorido aparece (azul/vermelho mais claros no tema escuro); digitar no fim de uma palavra azul continua azul.
7. ⌘,: painel mínimo; volume/sons/desgaste mudam na hora (desgaste 0 = texto limpo).
8. ⌘⇧I fora da máquina de escrever: nada acontece.

- [ ] **Step 7: Commit**

```bash
git add src/ui/InkRibbon.svelte src/ui/TypewriterControls.svelte src/ui/stores/workspace.svelte.ts src/ui/App.svelte src/ui/StatusBar.svelte
git commit -m "feat: fita de tinta, ⌘⇧I e painel da máquina de escrever

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Sons

**Files:**
- Create: `public/sounds/key-1.m4a` … `key-4.m4a`, `space.m4a`, `return.m4a`, `bell.m4a`, `ratchet.m4a`, `backspace.m4a`
- Create: `SOUNDS-NOTICE.md`
- Create: `src/application/ports/typewriter-sounds.ts`
- Create: `src/infrastructure/audio/typewriter-sounds.ts`
- Modify: `src/ui/stores/workspace.svelte.ts`, `src/ui/EditorPane.svelte`, `src/main.ts`

**Interfaces:**
- Consumes: `type CarriageEvent` (Task 10); `EditorEvents.onCarriage` (Task 10).
- Produces:
  ```ts
  export interface TypewriterSoundPlayer {
    configure(enabled: boolean, volume: number): void;
    /** true se carregou tudo */
    load(): Promise<boolean>;
    play(event: CarriageEvent): void;
  }
  ```
  `WorkspaceDeps.sounds: TypewriterSoundPlayer`; `Workspace.onCarriage(events: CarriageEvent[]): void`.

- [ ] **Step 1: Obter os samples — PONTO DE DECISÃO DO USUÁRIO.** Estado da pesquisa (2026-10-18):
  - **Ding (CC0, confirmado, sem login):** `https://commons.wikimedia.org/wiki/File:406243_stubb_typewriter-ding-near-mono.wav` (autor `_stubb`, CC0).
  - **Teclas, espaço, retorno, catraca, recuo:** não há pacote CC0 de máquina de escrever baixável sem login. Opções:
    - **(a) Freesound, CC0** — o usuário (com conta) baixa de `https://freesound.org/search/?q=typewriter&f=license:%22Creative+Commons+0%22` arquivos de: 4 batidas de tecla isoladas, 1 barra de espaço, 1 retorno do carro, 1 catraca de avanço de linha, 1 recuo (backspace), e coloca em `~/Downloads/tinta-sons/` com os nomes `key-1..4`, `space`, `return`, `ratchet`, `backspace` (qualquer extensão).
    - **(b) Wikimedia, CC BY 4.0** — recortar de `File:WWS_Typewriter.ogg` (Commons: Work With Sounds, 26 s de máquina real). Exige atribuição no `SOUNDS-NOTICE.md` (compatível com o projeto, mas não é CC0).

  **Parar e perguntar ao usuário qual opção.** Não seguir sem resposta.

- [ ] **Step 2: Converter para `.m4a`.**

```bash
brew list ffmpeg >/dev/null 2>&1 || brew install ffmpeg
mkdir -p public/sounds
curl -fsSL -o /tmp/claude-bell.wav "https://upload.wikimedia.org/wikipedia/commons/9/9f/406243_stubb_typewriter-ding-near-mono.wav"
ffmpeg -y -loglevel error -i /tmp/claude-bell.wav -ac 1 -c:a aac -b:a 96k public/sounds/bell.m4a
```

Opção (a): para cada arquivo em `~/Downloads/tinta-sons/` (`key-1`…`backspace`):

```bash
for f in ~/Downloads/tinta-sons/*; do
  name=$(basename "${f%.*}")
  ffmpeg -y -loglevel error -i "$f" -ac 1 -af "silenceremove=start_periods=1:start_threshold=-45dB,atrim=0:1.5,afade=t=out:st=1.2:d=0.3" -c:a aac -b:a 96k "public/sounds/$name.m4a"
done
```

Opção (b): baixar `https://upload.wikimedia.org/wikipedia/commons/2/25/WWS_Typewriter.ogg`, abrir num editor de áudio (ou `ffplay`) para anotar os tempos de cada evento, e recortar cada um com `ffmpeg -ss <início> -t <duração> -i WWS_Typewriter.ogg -ac 1 -c:a aac -b:a 96k public/sounds/<nome>.m4a`. Mostrar os tempos escolhidos ao usuário antes de commitar.

Conferir: `ls public/sounds/` → 9 arquivos `.m4a`; total < 500 KB (`du -sh public/sounds`).

- [ ] **Step 3: `SOUNDS-NOTICE.md`** (no padrão do `LEXICON-NOTICE.md`; preencher a tabela com a fonte real de cada arquivo):

```markdown
# Sons da máquina de escrever — atribuição

Os arquivos em `public/sounds/` tocam no estilo máquina de escrever (⌘E).
Convertidos para AAC mono 96 kbps (`.m4a`), recortados e normalizados.

| Arquivo | Fonte | Autor | Licença |
|---|---|---|---|
| `bell.m4a` | https://commons.wikimedia.org/wiki/File:406243_stubb_typewriter-ding-near-mono.wav | _stubb | CC0 1.0 |
| `key-1.m4a` | <url> | <autor> | <licença> |
| … | | | |
```

- [ ] **Step 4: Porta** — `src/application/ports/typewriter-sounds.ts`:

```ts
import type { CarriageEvent } from "../../domain/services/carriage";

/** Sons da máquina de escrever — Web Audio na infraestrutura. */
export interface TypewriterSoundPlayer {
  configure(enabled: boolean, volume: number): void;
  /** true se todos os samples carregaram */
  load(): Promise<boolean>;
  play(event: CarriageEvent): void;
}
```

- [ ] **Step 5: Adapter** — `src/infrastructure/audio/typewriter-sounds.ts`:

```ts
import type { TypewriterSoundPlayer } from "../../application/ports/typewriter-sounds";
import type { CarriageEvent } from "../../domain/services/carriage";

const FILES: Record<CarriageEvent, string[]> = {
  key: ["key-1", "key-2", "key-3", "key-4"],
  space: ["space"],
  backspace: ["backspace"],
  return: ["return"],
  bell: ["bell"],
  linefeed: ["ratchet"],
};

/**
 * Samples pré-carregados como AudioBuffer. Teclas sorteadas com tom ±5% e
 * volume ±15% para não soar repetitivo. Carrega só na primeira entrada no
 * estilo (o AudioContext nasce depois de um gesto do usuário — o ⌘E).
 */
export class WebAudioTypewriterSounds implements TypewriterSoundPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private loading: Promise<boolean> | null = null;
  private enabled = false;
  private volume = 0.6;

  configure(enabled: boolean, volume: number): void {
    this.enabled = enabled;
    this.volume = volume;
    if (this.master) this.master.gain.value = volume;
  }

  load(): Promise<boolean> {
    this.loading ??= this.loadAll();
    return this.loading;
  }

  private async loadAll(): Promise<boolean> {
    try {
      const ctx = new AudioContext();
      const master = ctx.createGain();
      master.gain.value = this.volume;
      master.connect(ctx.destination);
      this.ctx = ctx;
      this.master = master;
      const names = [...new Set(Object.values(FILES).flat())];
      await Promise.all(
        names.map(async (name) => {
          const res = await fetch(`/sounds/${name}.m4a`);
          if (!res.ok) throw new Error(`som ausente: ${name}`);
          this.buffers.set(name, await ctx.decodeAudioData(await res.arrayBuffer()));
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  play(event: CarriageEvent): void {
    const { ctx, master } = this;
    if (!this.enabled || !ctx || !master) return;
    if (ctx.state === "suspended") void ctx.resume();
    const options = FILES[event];
    const buffer = this.buffers.get(options[Math.floor(Math.random() * options.length)]!);
    if (!buffer) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    if (event === "key") {
      source.playbackRate.value = 0.95 + Math.random() * 0.1;
      gain.gain.value = 0.85 + Math.random() * 0.3;
    }
    source.connect(gain).connect(master);
    source.start();
  }
}
```

- [ ] **Step 6: Workspace.** Imports: `import type { TypewriterSoundPlayer } from "../../application/ports/typewriter-sounds";` e `import type { CarriageEvent } from "../../domain/services/carriage";`.

`WorkspaceDeps`: `sounds: TypewriterSoundPlayer;`

Campo privado: `private soundWarned = false;`

Método novo (seção `// ── tema / settings`):

```ts
  /** sons ligados só no typewriter real; carrega na primeira entrada */
  private syncSounds(): void {
    const on = this.isRealTypewriter && this.theme.typewriterSound;
    this.deps.sounds.configure(on, this.theme.typewriterVolume);
    if (!on) return;
    void this.deps.sounds.load().then((ok) => {
      if (ok || this.soundWarned) return;
      this.soundWarned = true;
      this.showHud("sons indisponíveis");
    });
  }

  onCarriage(events: CarriageEvent[]): void {
    for (const e of events) this.deps.sounds.play(e);
  }
```

Chamar `this.syncSounds();` no fim de `updateTheme()` e no fim de `init()` (antes de `this.ready = true;`).

`src/ui/EditorPane.svelte`: no objeto de eventos, `onCarriage: (events) => workspace.onCarriage(events),`.

`src/main.ts`: `import { WebAudioTypewriterSounds } from "./infrastructure/audio/typewriter-sounds";` e `sounds: new WebAudioTypewriterSounds(),` no `new Workspace({…})`.

- [ ] **Step 7: Verificar**

Run: `npm test && npm run check`
Expected: verde, 0 erros.

Run: `npm run tauri dev`, estilo `máquina de escrever`:
1. Cada letra soa como tecla, com pequenas variações; espaço tem som próprio.
2. Enter: retorno + catraca. Quebra automática: tecla + retorno + catraca.
3. Ding uma vez por linha perto da margem (coluna 59).
4. Backspace: som de recuo.
5. Clicar em outra linha: silêncio.
6. ⌘, → volume a 0%: mudo; sons off: mudo. Fora do estilo: mudo.
7. Renomear temporariamente `public/sounds/bell.m4a` → HUD `sons indisponíveis` uma vez; desfazer o rename.
8. `npm run tauri build` e abrir o `.app`: os sons tocam também no build (servidos de `dist/sounds/`).

- [ ] **Step 8: Commit**

```bash
git add public/sounds SOUNDS-NOTICE.md src/application/ports/typewriter-sounds.ts src/infrastructure/audio/typewriter-sounds.ts src/ui/stores/workspace.svelte.ts src/ui/EditorPane.svelte src/main.ts
git commit -m "feat: sons da máquina de escrever

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Documentação e verificação final

**Files:**
- Modify: `README.md`, `src/ui/content/guide.ts`

- [ ] **Step 1: README.** Na tabela "## Atalhos", depois da linha do `⌘⇧F`:

```markdown
| `⌘E` | estilo do workspace (padrão → máquina de escrever → transparência → papel) |
| `⌘⇧I` | tinta preta/azul/vermelha (máquina de escrever; com seleção, recolore o trecho) |
```

Depois da seção "## Segurança dos dados", acrescentar:

```markdown
## Estilos do workspace (⌘E)

- **Padrão** — o tinta de sempre.
- **Máquina de escrever** — a tela vira uma folha que sobe; carro móvel,
  tinta com imperfeições, sons. Tinta azul/vermelha por trecho (⌘⇧I).
- **Transparência** — fundo translúcido com desfoque nativo opcional; o
  texto continua opaco. Requer `macOSPrivateApi` (fora da Mac App Store).
- **Papel** — folhas A4 paginadas; parágrafos nunca se partem entre folhas.

As cores da tinta **nunca** entram na nota: ficam em
`<biblioteca>/.ink/<nota>.json`, reancoradas pelo próprio texto se a nota
for editada fora do tinta. Sem o lateral, a nota é só texto — como sempre.
```

Na árvore de "## Arquitetura", acrescentar `ink-runs, page-breaks, carriage, ink-wear` à linha de `services/` e `audio/` sob `infrastructure/`; em `src-tauri/src/commands/` acrescentar `ink`.

- [ ] **Step 2: Guia.** Ler `src/ui/content/guide.ts` e, na lista de atalhos/modos do guia (onde estão ⌘D, ⌘T, ⌘\ e ⌘⇧F), acrescentar no mesmo tom:

```markdown
- **⌘E — estilos.** Alterna a aparência do workspace: padrão, máquina de
  escrever (a tela vira folha, com carro, tinta e sons), transparência e
  papel (folhas A4). Na transparência e no papel, todos os atalhos acima
  continuam valendo.
- **⌘⇧I — tinta.** Na máquina de escrever, troca entre preto, azul e
  vermelho. Com um trecho selecionado, recolore só ele. A cor nunca entra
  no arquivo: suas notas seguem sendo texto puro.
```

- [ ] **Step 3: Verificação completa**

Run: `npm test && npm run check && (cd src-tauri && cargo test)`
Expected: todas as suítes verdes; svelte-check 0 erros.

Run: `npm run tauri build`
Expected: `.app` e `.dmg` gerados em `src-tauri/target/release/bundle/`.

Abrir o `.app` gerado e repassar os roteiros manuais dos Tasks 4, 5, 6, 9, 10, 11, 12 e 13. Por último, confirmar o princípio: `git status` na pasta da biblioteca de teste (ou `grep -rl "ink" <biblioteca> --include=*.md --include=*.txt`) não mostra nenhuma nota com marcação de cor.

- [ ] **Step 4: Commit e push**

```bash
git add README.md src/ui/content/guide.ts
git commit -m "docs: estilos do workspace e tinta por trecho

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```
