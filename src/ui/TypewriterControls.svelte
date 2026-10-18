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
