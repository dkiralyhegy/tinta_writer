# Estilos de workspace (⌘E) — design

Data: 2026-10-18 · Branch: `feature/workspace-styles`

## Objetivo

Adicionar ao tinta um eixo novo de aparência, o **estilo do workspace**,
alternado com `⌘E`, com quatro valores:

1. **padrão** — o tinta de hoje, inalterado.
2. **typewriter real** — imersivo: a tela vira uma folha que sai de baixo
   (do teclado) e sobe infinitamente; carro móvel, tinta preta/azul/vermelha
   com imperfeições, animações e sons de máquina de escrever.
3. **transparência** — o fundo da janela fica translúcido (opacidade
   ajustável, desfoque nativo opcional); as letras ficam 100% opacas.
4. **papel** — o texto em folhas A4 paginadas sobre uma mesa.

Requisito de contribuição: tudo é **opt-in**. Quem nunca apertar `⌘E` não
vê diferença nenhuma (o estilo padrão é `standard`, e o `.md` só ganha
marcação quando o usuário usa tinta colorida).

Fora de escopo: exportar PDF das páginas; cores de tinta além das três;
escolher a tinta fora do typewriter real (o texto colorido aparece e se
preserva em todos os estilos, mas a cor só se escolhe no typewriter real).

## Ciclo e interação com os modos existentes

Ordem do `⌘E`: `standard → typewriter-real → transparent → paper → standard`.
HUD a cada troca: `estilo: papel` etc. O estilo é persistido nos settings.

| Atalho | padrão | typewriter real | transparência | papel |
|---|---|---|---|---|
| `⌘D` foco | ✓ | HUD "indisponível no typewriter real" | ✓ | ✓ |
| `⌘T` typewriter | ✓ | HUD "indisponível…" (o carro já é o typewriter) | ✓ | ✓ |
| `⌘\` sidebar | ✓ | sem efeito (zen forçado) | ✓ | ✓ |
| `⌘⇧F` / `Esc` zen | ✓ | sem efeito; HUD "⌘E troca o estilo" | ✓ | ✓ |
| `⌘,` ajustes | painel completo | painel mínimo do typewriter | painel completo | painel completo |
| `⌘⇧I` tinta | — | cicla tinta / recolore seleção | — | — |
| `⌘S` `⌘J` `⌘F` | ✓ | ✓ | ✓ | ✓ |

**Zen forçado.** O typewriter real esconde todo o chrome (topbar, sidebar,
status bar, painel completo) sem tocar no `zenMode` do usuário. A
visibilidade do chrome passa a ser derivada:
`chromeHidden = zenMode || workspaceStyle === "typewriter-real"`.
Sair do typewriter real devolve exatamente o estado anterior. A faixa de
arrastar janela do zen continua existindo.

O `focusMode` e o `typewriter` do usuário **não são alterados** ao entrar no
typewriter real — apenas ignorados enquanto ele estiver ativo (o
`CmEditor` não carrega essas extensões nesse estilo) e voltam ao sair.

## Modelo de dados

### `ThemeConfig` (domain/entities/theme-config.ts)

Campos novos, todos validados em `normalizeTheme` (enum inválido → default,
números com clamp) e persistidos junto do tema:

| Campo | Tipo / faixa | Default |
|---|---|---|
| `workspaceStyle` | `"standard" \| "typewriter-real" \| "transparent" \| "paper"` | `"standard"` |
| `windowOpacity` | número 0.15–1.0 | `0.75` |
| `windowBlur` | `"off" \| "light" \| "strong"` | `"light"` |
| `ink` | `"black" \| "blue" \| "red"` (tinta ativa) | `"black"` |
| `typewriterSound` | boolean | `true` |
| `typewriterVolume` | número 0–1 | `0.6` |
| `inkWear` | número 0–1 | `0.5` |

Constantes exportadas: `WORKSPACE_STYLES`, `INKS`, `WINDOW_BLURS`.
Função pura `nextWorkspaceStyle(current): WorkspaceStyle` no mesmo arquivo.

### Tinta por trecho — formato no `.md`

Trechos coloridos são HTML inline válido em Markdown:

```md
Texto preto <span style="color:#1f3a93">texto azul</span> e
<span style="color:#a3231f">vermelho</span>.
```

Regras (implementadas em `domain/services/ink-spans.ts`):

- **Preto nunca gera marcação.** Recolorir para preto remove o span.
- Cores canônicas: azul `#1f3a93`, vermelho `#a3231f`. O parser aceita
  maiúsculas/minúsculas, espaços em volta de `:` e `;` final. Qualquer outro
  `<span>` (outra cor, outros atributos) **não é tinta** — fica como texto
  comum/HTML e é renderizado como hoje.
- **Sem aninhamento** e **sem atravessar linha**: um span abre e fecha na
  mesma linha do documento. Recolorir um range multilinha gera um span por
  linha. Isso mantém o Markdown inline válido em qualquer renderizador.
- Markdown inline dentro do span (ex.: `**negrito**`) é permitido e
  continua funcionando.
- **Normalização** após toda operação: spans adjacentes de mesma cor se
  fundem; spans vazios somem.

API do serviço (pura, sem dependências externas):

```ts
type Ink = "black" | "blue" | "red";
interface InkRun { from: number; to: number; ink: Ink }   // posições do TEXTO VISÍVEL
interface InkTag { from: number; to: number }              // posições das tags no doc

parseInkLine(line: string): { runs: InkRun[]; tags: InkTag[] }
/** reescreve [from,to) do doc com a tinta dada; devolve as mudanças a aplicar */
recolor(doc: string, from: number, to: number, ink: Ink): TextChange[]
/** onde/como inserir texto digitado com a tinta ativa */
insertWithInk(doc: string, pos: number, text: string, ink: Ink): TextChange[]
```

`TextChange = { from: number; to: number; insert: string }` — o adapter do
CodeMirror traduz para `ChangeSpec`.

Comportamento de `insertWithInk`:
- posição dentro de um span da mesma cor → insere direto;
- vizinho imediato (antes ou depois) é span da mesma cor → insere dentro
  dele, estendendo-o;
- tinta preta dentro de um span colorido → fecha o span, insere, reabre;
- caso contrário → `<span style="color:…">texto</span>`.

**Exibição.** A extensão `inkSpans()` fica ativa em **todos** os estilos:
pinta os trechos com a cor da tinta e esmaece as tags (como os demais
marcadores markdown). No typewriter real as tags viram replace decorations
**atômicas** (invisíveis; o cursor pula por cima). As cores canônicas
mapeiam para CSS vars ajustadas por tema (`--tinta-ink-blue`,
`--tinta-ink-red`), para continuarem legíveis no dark mode
(azul `#7f9be0`, vermelho `#e0675f` sobre ink).

**Escolher a tinta** só existe no typewriter real (indicador de fita +
`⌘⇧I`). Nos outros estilos o texto colorido aparece, edita e se preserva,
mas a tinta ativa é sempre preta.

## Arquitetura

Seguindo as camadas atuais (`ui → application → domain`; infraestrutura
implementa portas):

```
src/domain/entities/theme-config.ts        + campos, constantes, nextWorkspaceStyle
src/domain/services/ink-spans.ts           NOVO  parse/recolor/insert puros
src/domain/services/page-breaks.ts         NOVO  cálculo puro de quebras de página
src/application/ports/window-appearance.ts NOVO  porta: setTransparent/setBlur
src/infrastructure/tauri/tauri-window-appearance.ts  NOVO adapter (setEffects)
src/infrastructure/audio/typewriter-sounds.ts        NOVO Web Audio + pool de buffers
src/infrastructure/codemirror/ink.ts                 NOVO inkSpans() + filtro de digitação
src/infrastructure/codemirror/real-typewriter.ts     NOVO carro, batida, desgaste
src/infrastructure/codemirror/paper-pages.ts         NOVO espaçadores + layer de folhas
src/infrastructure/codemirror/editor.ts    + styleModeCompartment, inkCompartment,
                                             setInk(), recolorSelection()
src/ui/stores/workspace.svelte.ts          + cycleWorkspaceStyle, cycleInk, chromeHidden
src/ui/App.svelte                          + ⌘E, ⌘⇧I, chrome derivado
src/ui/SettingsPanel.svelte                + seção "estilo do workspace"
src/ui/TypewriterControls.svelte           NOVO painel mínimo do ⌘, no typewriter real
src/ui/InkRibbon.svelte                    NOVO indicador de fita (3 pontos)
src/ui/StatusBar.svelte                    + "página N de M", atalhos novos no popover
src/ui/styles/style-typewriter-real.css    NOVO
src/ui/styles/style-transparent.css        NOVO
src/ui/styles/style-paper.css              NOVO
src/assets/fonts/CourierPrime-*.ttf        NOVO (SIL OFL)
public/sounds/*.ogg                        NOVO (CC0)
SOUNDS-NOTICE.md                           NOVO atribuição/licença dos sons
src-tauri/tauri.conf.json                  transparent + macOSPrivateApi
src-tauri/Cargo.toml                       feature macos-private-api
src-tauri/capabilities/default.json        core:window:allow-set-effects
README.md, src/ui/content/guide.ts         documentar ⌘E e ⌘⇧I
```

**DOM.** `applyThemeToDom()` grava `data-style="<estilo>"` no `<html>`
(como `data-theme`/`data-accent`) e a opacidade em
`--tinta-window-opacity`. Cada estilo tem seu CSS por seletor de atributo.

**Editor.** `CmEditor` ganha:
- `styleModeCompartment`: `realTypewriter(config, sounds)`, `paperPages()`
  ou `[]`. No typewriter real, os compartments de foco e typewriter são
  reconfigurados para `[]` e o tema dimensional usa Courier Prime / 65ch.
- `inkCompartment`: `inkSpans({ hideTags, activeInk })`, sempre presente.
- `setInk(ink)` e `recolorSelection(ink): boolean` (false se a seleção é
  vazia) chamados pelo `Workspace`.

O `Workspace` chama `deps.windowAppearance` ao trocar de estilo/opacidade/
desfoque; `main.ts` injeta `TauriWindowAppearance` e o
`TypewriterSounds` (este passado ao `CmEditor` via `EditorPane`).

## Typewriter real

**Cena.** A tela inteira é a folha: off-white quente (`#f6f1e7`) com textura
de fibra sutil (ruído SVG inline em data URI, sem imagem externa). Sempre
papel claro, independente do tema. A **linha de batida** fica fixa a ~65%
da altura da janela; logo abaixo, um gradiente de sombra sugere o papel
curvando em volta do rolo — o papel "sai do teclado". Texto escrito sobe
acima dessa linha. Ao entrar no estilo, a folha **alimenta** de baixo para
cima (~600 ms). Folha infinita, sem paginação.

**Tipografia.** Courier Prime, coluna fixa de 65 caracteres, corpo do
`fontSize` do usuário. Headings sem escala (máquina tem um corpo só);
marcadores markdown aparecem como caracteres batidos na tinta normal;
**negrito = dupla batida** (text-shadow deslocado 0,5 px); *itálico =
sublinhado*.

**Carro móvel.**
- Posição vertical: equivalente ao typewriter scrolling atual, mas com o
  cursor ancorado a 65% em vez de 50% (`scrollIntoView` com `yMargin`
  calculado), animado (~120 ms) no avanço de linha.
- Posição horizontal: a camada do conteúdo recebe
  `translateX(centroDaJanela − xDoCursor)`, então o ponto de batida fica
  fixo no centro e a folha desliza para a esquerda. A cada caractere,
  transição curta (~40 ms, "escape" mecânico).
- **Retorno do carro**: quando o cursor muda de linha visual (Enter ou
  quebra automática), a folha volta em ~280 ms (ease-out) + som de retorno
  + avanço de linha com som de catraca.
- **Ding**: uma vez por linha visual, quando o cursor passa da coluna 59
  (6 antes da margem).
- Clique/setas para outro ponto → transição do carro até lá, sem sons de
  retorno (modo híbrido: edição livre).
- `prefers-reduced-motion` → todas as transições viram saltos instantâneos.

**Batida.** Caractere recém-inserido recebe a classe `tw-strike` por 60 ms
(escala 1.08 → 1, opacidade 0.4 → alvo). A folha dá um micro-tranco de
1 px vertical a cada batida. Backspace apaga de verdade (híbrido) e toca o
som de recuo.

**Desgaste da tinta.** Mark decorations por caractere, **só nas
`visibleRanges`**, com valores **determinísticos** a partir de
`hash(posição no doc, caractere)` — nada treme em repaint; a mesma letra
na mesma posição é sempre igual. Por caractere (escalado por `inkWear`):

- opacidade 0.78–1.0;
- `translateY` ±0,6 px, `rotate` ±1,2°;
- leve sangramento (`text-shadow` 0 0 0.4px da própria cor);
- ~5% "batidas fracas": metade inferior mais clara (gradiente em
  `background-clip: text`).

`inkWear = 0` desliga tudo (texto limpo). Cores de tinta: preto `#1d1c1a`,
azul `#1f3a93`, vermelho `#a3231f`.

**Fita (seleção de tinta).** `InkRibbon.svelte`: três pontos no canto
inferior direito, o ativo preenchido — único elemento de UI visível no
estilo.
- Sem seleção: clicar num ponto ou `⌘⇧I` (cicla preto→azul→vermelho)
  troca a **tinta ativa**; o que for digitado depois sai nela (filtro de
  transação em `ink.ts` aplica `insertWithInk`). HUD `tinta: azul`.
- Com seleção: a mesma ação **recolore só o trecho** (`recolor`), e a tinta
  ativa passa a ser essa cor.
- A tinta ativa é persistida (`ink`).

**Sons.** `TypewriterSounds` pré-carrega `AudioBuffer`s de
`public/sounds/` na primeira entrada no estilo:

| Evento | Arquivo(s) |
|---|---|
| tecla | `key-1..4.ogg` (sorteada; tom ±5%, volume ±15%) |
| espaço | `space.ogg` |
| retorno do carro | `return.ogg` |
| ding | `bell.ogg` |
| avanço de linha | `ratchet.ogg` |
| backspace | `backspace.ogg` |

Ganho mestre = `typewriterVolume`; `typewriterSound = false` não carrega
nada. Samples **CC0**, com fonte e licença de cada arquivo em
`SOUNDS-NOTICE.md`. Se não for possível obter samples CC0 adequados sem
login, o usuário baixa os arquivos indicados e a integração segue igual.

**Painel mínimo (`⌘,`).** `TypewriterControls.svelte`: tinta ativa, sons
liga/desliga, volume, desgaste da tinta.

## Papel

**Cena.** Mesa neutra (claro `#d9d2c8`, escuro `#1a1a1b`). Folhas A4
(proporção 1:√2); largura = coluna + margens laterais de ~2,5 cm
equivalentes (escaladas à coluna); margem superior/inferior idem. Folha
branca no tema claro, grafite (`#2a2a2b`) no escuro. Sombra suave
`0 2px 12px rgb(0 0 0 / 0.12)` — exceção ao "sem sombras" do brandbook,
restrita a este estilo. Vão entre folhas: 32 px.

**Paginação** (`page-breaks.ts` + `paper-pages.ts`):
- Função pura `computePageBreaks(lineHeights: number[], pageContentHeight)
  → { breakBefore: number[]; pageHeights: number[] }`. Um parágrafo
  (linha do doc) que não cabe no restante da folha vai inteiro para a
  próxima ("manter linhas juntas"); um parágrafo maior que uma folha
  inteira estica aquela folha (`pageHeights[i] > pageContentHeight`).
- `paperPages()` (ViewPlugin): coleta as alturas dos blocos de linha via
  `view.lineBlockAt`, **descontando** as alturas dos próprios espaçadores,
  chama a função pura e aplica block widgets espaçadores antes do primeiro
  parágrafo de cada folha (resto da folha anterior + vão + margem
  superior). Desconta os próprios widgets → converge numa passada.
  Recalcula em `geometryChanged`/`docChanged` via `requestMeasure`.
- Folhas desenhadas como retângulos numa `layer()` do CodeMirror atrás do
  texto, com o número da folha no pé (label mono).
- Linhas fora do viewport usam altura estimada pelo CodeMirror; as quebras
  se ajustam quando medidas, sem saltos na área visível.
- Status bar: `página N de M` (N = folha onde está o cursor).

Todos os atalhos funcionam; no zen ficam mesa e folhas.

## Transparência

**Janela.** `tauri.conf.json`: `"transparent": true` na janela e
`"macOSPrivateApi": true` em `app`; `Cargo.toml`: feature
`macos-private-api` no `tauri`. Nos outros estilos o `body` continua com
fundo opaco, então nada muda visualmente neles. Nota para o PR:
`macOSPrivateApi` impede distribuição na Mac App Store (DMG não é afetado).

**Opacidade.** Em `[data-style="transparent"]`: `body`, sidebar, status
bar e painel usam
`color-mix(in srgb, var(--ab-bg) calc(var(--tinta-window-opacity) * 100%), transparent)`;
sidebar/status bar/painel com +15 pontos de opacidade para legibilidade.
As cores de texto não mudam → letras 100% opacas.

**Desfoque.** Porta `WindowAppearance { setBlur(level: WindowBlur): Promise<void> }`.
Adapter Tauri: `getCurrentWindow().setEffects({ effects: [material] })`
com `light → Effect.Sidebar`, `strong → Effect.HudWindow`; `off` ou saída
do estilo → `clearEffects()`. Permissão `core:window:allow-set-effects`.

**Ajustes.** Na seção nova do painel: slider de opacidade (15–100%) e
seletor de desfoque (desligado / leve / forte). Todos os atalhos
funcionam.

## Painel de ajustes

Seção nova "estilo do workspace" em `SettingsPanel.svelte`: seletor dos
quatro estilos e, abaixo, os controles do estilo ativo (transparência:
opacidade + desfoque; typewriter real: tinta, som, volume, desgaste).

## Erros

- Falha ao carregar áudio → estilo segue mudo; HUD `sons indisponíveis`
  uma vez por sessão.
- Falha no `setEffects` → só a transparência (sem desfoque); sem HUD.
- `<span>` malformado ou de cor desconhecida → texto comum, sem quebra.
- Settings antigos sem os campos novos → defaults via `normalizeTheme`.

## Testes

Vitest, sem DOM/Tauri/CodeMirror, como os existentes:

- `tests/domain/ink-spans.test.ts`: parse (variações de grafia, spans não
  canônicos ignorados), `recolor` (dentro de um span, cruzando spans,
  parcial nas bordas, multilinha → um span por linha, para preto remove,
  normalização/fusão), `insertWithInk` (todos os casos acima), round-trip.
- `tests/domain/page-breaks.test.ts`: doc vazio, tudo numa folha,
  parágrafo empurrado, parágrafo maior que folha, várias folhas.
- `tests/domain/theme-config.test.ts`: novos campos (defaults, enums
  inválidos, clamps) e `nextWorkspaceStyle` (ciclo completo).

Verificação manual com `npm run tauri dev` (carro, sons, vibrancy,
paginação, cores em light/dark) + `npm run check` + `npm test`.

## Ordem de implementação sugerida

1. Domínio: campos do tema, `nextWorkspaceStyle`, `ink-spans`,
   `page-breaks` (com testes).
2. ⌘E + `data-style` + chrome derivado + seção do painel.
3. Transparência (Tauri config, porta, adapter, CSS).
4. Papel.
5. Tinta por trecho (`ink.ts`) em todos os estilos.
6. Typewriter real: cena, carro, batida, desgaste, fita, painel mínimo.
7. Sons + `SOUNDS-NOTICE.md`.
8. README e guia.
