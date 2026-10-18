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
