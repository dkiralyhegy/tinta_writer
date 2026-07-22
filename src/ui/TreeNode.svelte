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
  let creating = $state<"note" | "folder" | null>(null);
  let createValue = $state("");
  let dropTarget = $state(false);

  const DRAG_NOTE = "application/x-tinta-note";
  const DRAG_FOLDER = "application/x-tinta-folder";

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
      if (node.isDir) void workspace.renameFolder(node.path, renameValue);
      else void workspace.renameNote(node.path, renameValue);
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
    if (node.isDir) void workspace.deleteFolder(node.path);
    else void workspace.deleteNote(node.path);
  }

  function startCreate(kind: "note" | "folder", e: MouseEvent) {
    e.stopPropagation();
    open = true;
    creating = kind;
    createValue = "";
  }

  function commitCreate() {
    const value = createValue.trim();
    const kind = creating;
    creating = null;
    if (!value || !kind) return;
    if (kind === "note") void workspace.createNote(node.path, value);
    else void workspace.createFolder(node.path, value);
  }

  // ── drag & drop ────────────────────────────────────────────────
  function onDragStart(e: DragEvent) {
    if (!e.dataTransfer) return;
    e.dataTransfer.setData(node.isDir ? DRAG_FOLDER : DRAG_NOTE, node.path);
    e.dataTransfer.effectAllowed = "move";
  }

  function isDraggedItem(e: DragEvent): boolean {
    const types = e.dataTransfer?.types;
    return !!types && (types.includes(DRAG_NOTE) || types.includes(DRAG_FOLDER));
  }

  function onDragOver(e: DragEvent) {
    if (!node.isDir || !isDraggedItem(e)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer!.dropEffect = "move";
    dropTarget = true;
  }

  function onDrop(e: DragEvent) {
    dropTarget = false;
    if (!node.isDir || !e.dataTransfer) return;
    const src = e.dataTransfer.getData(DRAG_NOTE) || e.dataTransfer.getData(DRAG_FOLDER);
    if (!src) return;
    e.preventDefault();
    e.stopPropagation();
    workspace.requestMove(src, node.path);
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
      class:drop-target={dropTarget}
      role="button"
      tabindex="0"
      draggable="true"
      onclick={onClick}
      onkeydown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      ondragstart={onDragStart}
      ondragover={onDragOver}
      ondragleave={() => (dropTarget = false)}
      ondrop={onDrop}
    >
      <span class="marker">{node.isDir ? (open ? "−" : "+") : "·"}</span>
      <span class="label">{label}</span>
      {#if node.isDir}
        <span class="actions">
          <button class="action" title="nova nota nesta pasta" onclick={(e) => startCreate("note", e)}>
            +n
          </button>
          <button class="action" title="nova subpasta" onclick={(e) => startCreate("folder", e)}>
            +p
          </button>
          <button class="action" title="renomear pasta" onclick={startRename}>r</button>
          <button
            class="action"
            class:danger={confirmingDelete}
            title={confirmingDelete
              ? "confirmar exclusão da pasta inteira (vai para a Lixeira)"
              : "excluir pasta"}
            onclick={onDelete}
          >
            {confirmingDelete ? "?" : "×"}
          </button>
        </span>
      {:else}
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

  {#if creating}
    <input
      class="rename create-inline"
      style:--depth={depth + 1}
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

  .row.drop-target {
    background: var(--tinta-hover-bg);
    box-shadow: inset 0 0 0 1px var(--tinta-accent);
  }

  .create-inline {
    width: calc(100% - var(--ab-space-4));
    margin: 2px var(--ab-space-2);
    margin-left: calc(var(--ab-space-2) + var(--depth) * var(--ab-space-4));
    font-size: var(--ab-size-small);
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
