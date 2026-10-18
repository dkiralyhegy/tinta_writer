<script lang="ts">
  import { onMount } from "svelte";
  import { CmEditor } from "../infrastructure/codemirror/editor";
  import type { Workspace } from "./stores/workspace.svelte";

  let { workspace }: { workspace: Workspace } = $props();
  let host: HTMLDivElement;

  onMount(() => {
    const editor = new CmEditor(host, workspace.theme, {
      onDocChanged: (getText, delta) => workspace.onDocChanged(getText, delta),
      onSave: () => void workspace.saveNow(),
      onPageInfo: (info) => workspace.onPageInfo(info),
    });
    workspace.attachEditor(editor);
    return () => editor.destroy();
  });
</script>

<div class="pane" bind:this={host}></div>

<style>
  .pane {
    flex: 1;
    min-width: 0;
    display: flex;
    user-select: text;
  }

  .pane :global(.cm-editor) {
    flex: 1;
    min-width: 0;
  }
</style>
