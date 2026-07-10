<script lang="ts">
  import type { Workspace } from "./stores/workspace.svelte";
  import TreeNode from "./TreeNode.svelte";

  let { workspace }: { workspace: Workspace } = $props();

  let creating = $state<"note" | "folder" | null>(null);
  let createValue = $state("");

  function startCreate(kind: "note" | "folder") {
    creating = kind;
    createValue = "";
  }

  function commitCreate() {
    const root = workspace.library?.rootPath;
    const value = createValue.trim();
    const kind = creating;
    creating = null;
    if (!root || !value || !kind) return;
    if (kind === "note") void workspace.createNote(root, value);
    else void workspace.createFolder(root, value);
  }
</script>

<aside class="sidebar">
  <div class="head">
    <span class="eyebrow root-name">{workspace.library?.root.name ?? "biblioteca"}</span>
    <div class="tools">
      <button class="tool" title="nota de hoje (⌘J)" onclick={() => void workspace.openToday()}>
        hoje
      </button>
      <button class="tool" title="nova nota" onclick={() => startCreate("note")}>+n</button>
      <button class="tool" title="nova pasta" onclick={() => startCreate("folder")}>+p</button>
    </div>
  </div>

  {#if creating}
    <input
      class="create"
      placeholder={creating === "note" ? "nome da nota" : "nome da pasta"}
      bind:value={createValue}
      onblur={commitCreate}
      onkeydown={(e) => {
        if (e.key === "Enter") commitCreate();
        if (e.key === "Escape") creating = null;
      }}
      autofocus
    />
  {/if}

  <nav class="tree">
    {#if workspace.library}
      {#each workspace.library.root.children as child (child.path)}
        <TreeNode node={child} {workspace} />
      {/each}
      {#if workspace.library.root.children.length === 0}
        <p class="hint">pasta vazia — crie a primeira nota com +n</p>
      {/if}
    {/if}
  </nav>

  <div class="foot">
    <button class="tool" onclick={() => void workspace.chooseRoot()}>trocar pasta</button>
    <button class="tool" onclick={() => workspace.openGuide()}>guia</button>
    <button class="tool" onclick={() => (workspace.settingsOpen = !workspace.settingsOpen)}>
      ajustes
    </button>
  </div>
</aside>

<style>
  .sidebar {
    width: 232px;
    flex: none;
    display: flex;
    flex-direction: column;
    background: var(--tinta-panel-bg);
    border-right: var(--ab-border-soft);
    min-height: 0;
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ab-space-2);
    padding: var(--ab-space-3) var(--ab-space-3);
  }

  .root-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tools {
    display: flex;
    gap: var(--ab-space-1);
    flex: none;
  }

  .tool {
    font-family: var(--ab-font-mono);
    font-size: var(--ab-size-eyebrow);
    letter-spacing: var(--ab-tracking-wide);
    text-transform: uppercase;
    color: var(--ab-fg-muted);
    padding: 3px 5px;
    transition: color var(--ab-dur-fast) var(--ab-ease-quick);
  }

  .tool:hover {
    color: var(--ab-fg);
    background: var(--tinta-hover-bg);
  }

  .create {
    margin: 0 var(--ab-space-3) var(--ab-space-2);
    font-size: var(--ab-size-small);
  }

  .tree {
    flex: 1;
    overflow-y: auto;
    padding-bottom: var(--ab-space-4);
  }

  .hint {
    padding: var(--ab-space-3);
    font-size: var(--ab-size-eyebrow);
    color: var(--ab-fg-muted);
    letter-spacing: var(--ab-tracking-mono);
  }

  .foot {
    display: flex;
    justify-content: space-between;
    padding: var(--ab-space-2) var(--ab-space-3);
    border-top: var(--ab-border-soft);
  }
</style>
