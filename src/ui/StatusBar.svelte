<script lang="ts">
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
    {#if modeLabel}<span class="dim">{modeLabel}</span>{/if}
    <span class="save" data-state={workspace.saveState}>{saveLabel}</span>
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
    width: 96px;
    height: 2px;
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
</style>
