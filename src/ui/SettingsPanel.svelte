<script lang="ts">
  import { ACCENTS, EDITOR_FONTS } from "../domain/entities/theme-config";
  import type { Workspace } from "./stores/workspace.svelte";

  let { workspace }: { workspace: Workspace } = $props();

  const theme = $derived(workspace.theme);

  const accentHex: Record<string, string> = {
    ember: "#BF4128",
    amber: "#EEA244",
    steel: "#4B657E",
    plum: "#582D40",
    moss: "#89993E",
    garnet: "#8A1D33",
  };
</script>

<aside class="panel">
  <div class="head">
    <span class="eyebrow">ajustes</span>
    <button class="close" onclick={() => (workspace.settingsOpen = false)}>fechar</button>
  </div>

  <div class="scroll">
    <section>
      <p class="eyebrow label">modo</p>
      <div class="segmented">
        {#each [["light", "claro"], ["dark", "escuro"], ["system", "sistema"]] as [value, name] (value)}
          <button
            class:on={theme.mode === value}
            onclick={() => workspace.updateTheme({ mode: value as never })}
          >
            {name}
          </button>
        {/each}
      </div>
    </section>

    <section>
      <p class="eyebrow label">fonte do editor</p>
      <div class="stack">
        {#each EDITOR_FONTS as font (font)}
          <button
            class="fontopt"
            class:on={theme.editorFont === font}
            style:font-family={font}
            onclick={() => workspace.updateTheme({ editorFont: font })}
          >
            {font}
          </button>
        {/each}
      </div>
    </section>

    <section>
      <p class="eyebrow label">corpo — {theme.fontSize}px</p>
      <input
        type="range"
        min="12"
        max="32"
        step="1"
        value={theme.fontSize}
        oninput={(e) => workspace.updateTheme({ fontSize: Number(e.currentTarget.value) })}
      />
    </section>

    <section>
      <p class="eyebrow label">entrelinha — {theme.lineHeight.toFixed(2)}</p>
      <input
        type="range"
        min="1.2"
        max="2.4"
        step="0.05"
        value={theme.lineHeight}
        oninput={(e) => workspace.updateTheme({ lineHeight: Number(e.currentTarget.value) })}
      />
    </section>

    <section>
      <p class="eyebrow label">largura da coluna — {theme.columnWidth}ch</p>
      <input
        type="range"
        min="40"
        max="120"
        step="2"
        value={theme.columnWidth}
        oninput={(e) => workspace.updateTheme({ columnWidth: Number(e.currentTarget.value) })}
      />
    </section>

    <section>
      <p class="eyebrow label">alinhamento do texto</p>
      <div class="segmented">
        <button class:on={!theme.justified} onclick={() => workspace.updateTheme({ justified: false })}>
          esquerda
        </button>
        <button class:on={theme.justified} onclick={() => workspace.updateTheme({ justified: true })}>
          justificado
        </button>
      </div>
    </section>

    <section>
      <p class="eyebrow label">acento</p>
      <div class="swatches">
        {#each ACCENTS as accent (accent)}
          <button
            class="swatch"
            class:on={theme.accent === accent}
            style:background={accentHex[accent]}
            title={accent}
            aria-label={accent}
            onclick={() => workspace.updateTheme({ accent })}
          ></button>
        {/each}
      </div>
    </section>

    <section>
      <p class="eyebrow label">modo foco — ⌘D</p>
      <div class="segmented">
        {#each [["off", "off"], ["sentence", "sentença"], ["paragraph", "parágrafo"]] as [value, name] (value)}
          <button
            class:on={theme.focusMode === value}
            onclick={() => workspace.updateTheme({ focusMode: value as never })}
          >
            {name}
          </button>
        {/each}
      </div>
    </section>

    <section>
      <p class="eyebrow label">typewriter — ⌘T</p>
      <div class="segmented">
        <button class:on={!theme.typewriter} onclick={() => workspace.updateTheme({ typewriter: false })}>
          off
        </button>
        <button class:on={theme.typewriter} onclick={() => workspace.updateTheme({ typewriter: true })}>
          on
        </button>
      </div>
    </section>

    <section>
      <p class="eyebrow label">meta diária de palavras</p>
      <input
        class="goal-input"
        type="number"
        min="0"
        step="50"
        placeholder="sem meta"
        value={workspace.goals.dailyWords ?? ""}
        onchange={(e) =>
          workspace.updateGoals({
            dailyWords: e.currentTarget.value ? Number(e.currentTarget.value) : null,
          })}
      />
    </section>

    <section>
      <p class="eyebrow label">biblioteca</p>
      <p class="path">{workspace.library?.rootPath ?? "nenhuma pasta escolhida"}</p>
      <button class="linkish" onclick={() => void workspace.chooseRoot()}>trocar pasta</button>
      <p class="note">
        dica: rode <span class="mono">git init</span> na pasta da biblioteca para versionar
        seus textos — o tinta já mantém snapshots locais em .snapshots
      </p>
    </section>
  </div>
</aside>

<style>
  .panel {
    width: 264px;
    flex: none;
    display: flex;
    flex-direction: column;
    background: var(--tinta-panel-bg);
    border-left: var(--ab-border-soft);
    min-height: 0;
  }

  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--ab-space-3);
    border-bottom: var(--ab-border-soft);
  }

  .close {
    font-size: var(--ab-size-eyebrow);
    letter-spacing: var(--ab-tracking-wide);
    text-transform: uppercase;
    color: var(--ab-fg-muted);
  }

  .close:hover {
    color: var(--ab-fg);
  }

  .scroll {
    flex: 1;
    overflow-y: auto;
    padding: var(--ab-space-4) var(--ab-space-3) var(--ab-space-6);
    display: flex;
    flex-direction: column;
    gap: var(--ab-space-5);
  }

  .label {
    color: var(--ab-fg-muted);
    margin-bottom: var(--ab-space-2);
  }

  .segmented {
    display: flex;
    border: var(--ab-border-soft);
  }

  .segmented button {
    flex: 1;
    padding: 6px 4px;
    font-size: var(--ab-size-eyebrow);
    letter-spacing: var(--ab-tracking-wide);
    text-transform: uppercase;
    color: var(--ab-fg-muted);
    transition:
      background var(--ab-dur-fast) var(--ab-ease-quick),
      color var(--ab-dur-fast) var(--ab-ease-quick);
  }

  .segmented button.on {
    background: var(--ab-fg);
    color: var(--ab-bg);
  }

  .stack {
    display: flex;
    flex-direction: column;
    gap: var(--ab-space-1);
  }

  .fontopt {
    text-align: left;
    padding: 8px 10px;
    border: var(--ab-border-soft);
    font-size: var(--ab-size-small);
    color: var(--ab-fg-muted);
  }

  .fontopt.on {
    color: var(--ab-fg);
    border-color: var(--ab-rule);
    box-shadow: inset 4px 0 0 var(--tinta-accent);
  }

  input[type="range"] {
    width: 100%;
    accent-color: var(--ab-fg);
    border: none;
    padding: 0;
  }

  .swatches {
    display: flex;
    gap: var(--ab-space-2);
  }

  .swatch {
    width: 30px;
    height: 30px;
    border: 1px solid transparent;
  }

  .swatch.on {
    outline: 1px solid var(--ab-rule);
    outline-offset: 3px;
  }

  .goal-input {
    width: 100%;
  }

  .path {
    font-size: var(--ab-size-eyebrow);
    color: var(--ab-fg-muted);
    word-break: break-all;
    margin-bottom: var(--ab-space-2);
  }

  .linkish {
    font-size: var(--ab-size-eyebrow);
    letter-spacing: var(--ab-tracking-wide);
    text-transform: uppercase;
    text-decoration: underline;
    color: var(--ab-fg);
  }

  .linkish:hover {
    opacity: 0.78;
  }

  .note {
    margin-top: var(--ab-space-3);
    font-size: var(--ab-size-eyebrow);
    color: var(--ab-fg-muted);
    line-height: var(--ab-leading-body);
  }

  .mono {
    font-family: var(--ab-font-mono);
  }
</style>
