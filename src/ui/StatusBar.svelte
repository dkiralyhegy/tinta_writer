<script lang="ts">
  import { formatReadingTime } from "../domain/services/reading-time";
  import type { Workspace } from "./stores/workspace.svelte";

  let { workspace }: { workspace: Workspace } = $props();

  const saveLabel = $derived(
    (
      {
        idle: "",
        pending: "gravando…",
        saved: "salvo",
        error: "erro ao salvar",
        conflict: "conflito",
      } as const
    )[workspace.saveState],
  );

  const modeLabel = $derived.by(() => {
    const parts: string[] = [];
    if (workspace.theme.focusMode !== "off")
      parts.push(workspace.theme.focusMode === "sentence" ? "foco:sentença" : "foco:parágrafo");
    if (workspace.theme.typewriter) parts.push("typewriter");
    return parts.join(" · ");
  });
</script>

<footer class="statusbar">
  <div class="cell left">
    <span>{workspace.wordsTotal} palavras</span>
    <span class="dim">{workspace.charsTotal} caracteres</span>
    <span class="dim">{formatReadingTime(workspace.wordsTotal)}</span>
  </div>

  <div class="cell center">
    {#if workspace.goalProgress}
      <div class="goal" class:done={workspace.goalProgress.done}>
        <span>{workspace.goalProgress.current} / {workspace.goalProgress.target} hoje</span>
        <span class="bar"><span class="fill" style:width={`${workspace.goalProgress.ratio * 100}%`}></span></span>
      </div>
    {:else}
      <span class="dim">{workspace.wordsToday} palavras hoje</span>
    {/if}
  </div>

  <div class="cell right">
    {#if workspace.pageInfo}
      <span class="dim">página {workspace.pageInfo.page} de {workspace.pageInfo.total}</span>
    {/if}
    {#if modeLabel}<span class="dim">{modeLabel}</span>{/if}
    <span class="save" data-state={workspace.saveState}>{saveLabel}</span>
    <span class="help" tabindex="0" aria-label="atalhos de teclado">
      ⌘
      <div class="pop" role="tooltip">
        <p class="pop-title">atalhos</p>
        {#each [["⌘S", "salvar agora"], ["⌘J", "nota de hoje"], ["⌘F", "buscar no texto"], ["⌘D", "modo foco (ciclar)"], ["⌘T", "typewriter"], ["⌘⇧S", "realce de sintaxe"], ["⌘\\", "sidebar"], ["⌘⇧F", "modo zen — esc sai"], ["⌘E", "estilo do workspace"], ["⌘,", "ajustes"]] as [k, label] (k)}
          <div class="row"><span class="key">{k}</span><span class="what">{label}</span></div>
        {/each}
      </div>
    </span>
  </div>
</footer>

<style>
  /* hairline inferior com labels mono — fecho do motivo do brandbook */
  .statusbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ab-space-4);
    height: 34px;
    padding: 0 var(--ab-space-4);
    border-top: var(--ab-border-soft);
    font-size: var(--ab-size-eyebrow);
    letter-spacing: var(--ab-tracking-wide);
    text-transform: uppercase;
    flex: none;
  }

  .cell {
    display: flex;
    align-items: center;
    gap: var(--ab-space-4);
    min-width: 0;
  }

  .left,
  .right {
    flex: 1;
  }

  .right {
    justify-content: flex-end;
  }

  .dim {
    color: var(--ab-fg-muted);
  }

  .goal {
    display: flex;
    align-items: center;
    gap: var(--ab-space-3);
  }

  .goal.done {
    color: var(--tinta-accent);
  }

  .bar {
    width: 120px;
    height: 4px;
    background: var(--ab-rule-soft);
    display: inline-block;
  }

  .fill {
    display: block;
    height: 100%;
    background: var(--tinta-accent);
    transition: width var(--ab-dur-base) var(--ab-ease);
  }

  .save[data-state="error"],
  .save[data-state="conflict"] {
    color: var(--tinta-accent);
  }

  /* glifo discreto — hover/focus revela o painel de atalhos */
  .help {
    position: relative;
    color: var(--tinta-dim);
    cursor: default;
    padding: 4px 2px;
  }

  .help:hover,
  .help:focus-visible {
    color: var(--ab-fg);
  }

  .pop {
    position: absolute;
    bottom: 24px;
    right: 0;
    width: max-content;
    background: var(--ab-fg);
    color: var(--ab-bg);
    padding: var(--ab-space-4);
    display: flex;
    flex-direction: column;
    gap: var(--ab-space-2);
    text-transform: none;
    letter-spacing: var(--ab-tracking-mono);
    opacity: 0;
    visibility: hidden;
    transform: translateY(4px);
    transition:
      opacity var(--ab-dur-fast) var(--ab-ease),
      transform var(--ab-dur-fast) var(--ab-ease),
      visibility 0s linear var(--ab-dur-fast);
    z-index: 10;
  }

  .help:hover .pop,
  .help:focus-visible .pop {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
    transition:
      opacity var(--ab-dur-fast) var(--ab-ease),
      transform var(--ab-dur-fast) var(--ab-ease);
  }

  .pop-title {
    text-transform: uppercase;
    letter-spacing: var(--ab-tracking-wide);
    opacity: 0.6;
    margin-bottom: var(--ab-space-1);
  }

  .row {
    display: flex;
    justify-content: space-between;
    gap: var(--ab-space-5);
  }

  .key {
    opacity: 0.7;
    min-width: 3.5ch;
  }
</style>
