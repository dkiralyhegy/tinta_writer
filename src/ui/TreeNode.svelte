<script lang="ts">
  import type { LibraryNode } from "../domain/entities/library";
  import type { Workspace } from "./stores/workspace.svelte";
  import TreeNode from "./TreeNode.svelte";

  let {
    node,
    workspace,
    depth = 0,
  }: { node: LibraryNode; workspace: Workspace; depth?: number } = $props();

  let open = $state(depth < 1);
  let renaming = $state(false);
  let renameValue = $state("");
  let confirmingDelete = $state(false);

  const isActive = $derived(workspace.note?.path === node.path);
  const label = $derived(node.isDir ? node.name : node.name.replace(/\.(md|markdown|txt)$/i, ""));

  function onClick() {
    if (node.isDir) {
      open = !open;
    } else {
      void workspace.openPath(node.path);
    }
  }

  function startRename(e: MouseEvent) {
    e.stopPropagation();
    renameValue = label;
    renaming = true;
  }

  function commitRename() {
    renaming = false;
    if (renameValue && renameValue !== label) {
      void workspace.renameNote(node.path, renameValue);
    }
  }

  function onDelete(e: MouseEvent) {
    e.stopPropagation();
    if (!confirmingDelete) {
      confirmingDelete = true;
      setTimeout(() => (confirmingDelete = false), 2500);
      return;
    }
    confirmingDelete = false;
    void workspace.deleteNote(node.path);
  }
</script>

<div class="node" style:--depth={depth}>
  {#if renaming}
    <input
      class="rename"
      bind:value={renameValue}
      onblur={commitRename}
      onkeydown={(e) => {
        if (e.key === "Enter") commitRename();
        if (e.key === "Escape") renaming = false;
      }}
      autofocus
    />
  {:else}
    <div
      class="row"
      class:active={isActive}
      class:dir={node.isDir}
      role="button"
      tabindex="0"
      onclick={onClick}
      onkeydown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <span class="marker">{node.isDir ? (open ? "−" : "+") : "·"}</span>
      <span class="label">{label}</span>
      {#if !node.isDir}
        <span class="actions">
          <button class="action" title="renomear" onclick={startRename}>r</button>
          <button
            class="action"
            class:danger={confirmingDelete}
            title={confirmingDelete ? "confirmar exclusão (vai para a Lixeira)" : "excluir"}
            onclick={onDelete}
          >
            {confirmingDelete ? "?" : "×"}
          </button>
        </span>
      {/if}
    </div>
  {/if}

  {#if node.isDir && open}
    {#each node.children as child (child.path)}
      <TreeNode node={child} {workspace} depth={depth + 1} />
    {/each}
  {/if}
</div>

<style>
  .node {
    display: contents;
  }

  .row {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: var(--ab-space-2);
    width: 100%;
    text-align: left;
    padding: 5px var(--ab-space-2);
    padding-left: calc(var(--ab-space-2) + var(--depth) * var(--ab-space-4));
    font-size: var(--ab-size-small);
    letter-spacing: var(--ab-tracking-mono);
    color: var(--ab-fg-muted);
    transition: background var(--ab-dur-fast) var(--ab-ease-quick);
  }

  .row:hover {
    background: var(--tinta-hover-bg);
    color: var(--ab-fg);
  }

  .row.active {
    color: var(--ab-fg);
    background: var(--tinta-hover-bg);
    box-shadow: inset 4px 0 0 var(--tinta-accent);
  }

  .row.dir {
    text-transform: uppercase;
    font-size: var(--ab-size-eyebrow);
    letter-spacing: var(--ab-tracking-wide);
    color: var(--ab-fg);
  }

  .marker {
    color: var(--tinta-dim);
    width: 1ch;
    flex: none;
  }

  .label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .actions {
    display: none;
    gap: 2px;
    flex: none;
  }

  .row:hover .actions {
    display: inline-flex;
  }

  .action {
    color: var(--tinta-dim);
    font-size: var(--ab-size-eyebrow);
    padding: 0 4px;
  }

  .action:hover {
    color: var(--ab-fg);
  }

  .action.danger {
    color: var(--tinta-accent);
  }

  .rename {
    width: calc(100% - var(--ab-space-4));
    margin: 2px var(--ab-space-2);
    margin-left: calc(var(--ab-space-2) + var(--depth) * var(--ab-space-4));
    font-size: var(--ab-size-small);
  }
</style>
