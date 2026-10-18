<script lang="ts">
  import { onMount } from "svelte";
  import type { Workspace } from "./stores/workspace.svelte";
  import Sidebar from "./Sidebar.svelte";
  import EditorPane from "./EditorPane.svelte";
  import StatusBar from "./StatusBar.svelte";
  import SettingsPanel from "./SettingsPanel.svelte";

  let { workspace }: { workspace: Workspace } = $props();

  const noteLabel = $derived(workspace.note ? workspace.note.title : "sem nota");

  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape" && workspace.zenMode && !workspace.isRealTypewriter) {
      workspace.toggleZen();
      return;
    }
    if (!e.metaKey) return;
    const key = e.key.toLowerCase();
    if (key === "f" && e.shiftKey) {
      e.preventDefault();
      workspace.toggleZen();
    } else if (key === "s" && e.shiftKey) {
      e.preventDefault();
      void workspace.togglePosHighlight();
    } else if (key === ",") {
      e.preventDefault();
      workspace.settingsOpen = !workspace.settingsOpen;
    } else if (key === "\\") {
      e.preventDefault();
      workspace.toggleSidebar();
    } else if (key === "d" && !e.shiftKey) {
      e.preventDefault();
      workspace.cycleFocusMode();
    } else if (key === "t" && !e.shiftKey) {
      e.preventDefault();
      workspace.toggleTypewriter();
    } else if (key === "e" && !e.shiftKey) {
      e.preventDefault();
      workspace.cycleWorkspaceStyle();
    } else if (key === "j") {
      e.preventDefault();
      void workspace.openToday();
    } else if (key === "s") {
      e.preventDefault();
      void workspace.saveNow();
    }
  }

  onMount(() => {
    const flush = () => void workspace.flushAll();
    window.addEventListener("blur", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("blur", flush);
      window.removeEventListener("beforeunload", flush);
    };
  });
</script>

<svelte:window onkeydown={onKeydown} />

<div class="app">
  {#if workspace.chromeHidden}
    <!-- faixa invisível para arrastar a janela sem chrome -->
    <div class="zen-drag" data-tauri-drag-region></div>
  {:else}
    <header class="topbar" data-tauri-drag-region>
      <span class="eyebrow">tinta</span>
      <span class="eyebrow muted">{noteLabel}</span>
    </header>
  {/if}

  <div class="body">
    {#if workspace.sidebarOpen && !workspace.chromeHidden}
      <Sidebar {workspace} />
    {/if}

    <main class="editor-area">
      {#if workspace.ready && !workspace.library && !workspace.note}
        <div class="empty">
          <p class="empty-title">tinta</p>
          <p class="empty-sub">escolha a pasta onde seus textos vivem</p>
          <button class="cta" onclick={() => void workspace.chooseRoot()}>
            escolher pasta
          </button>
        </div>
      {:else if workspace.ready && !workspace.note}
        <div class="empty">
          <p class="empty-sub">selecione uma nota — ou ⌘J para a nota de hoje</p>
        </div>
      {/if}
      <div class="editor-host" class:hidden={!workspace.note}>
        <EditorPane {workspace} />
      </div>
      {#if workspace.conflictNotice}
        <div class="conflict-banner">
          <span>{workspace.conflictNotice}</span>
          <button onclick={() => (workspace.conflictNotice = null)}>fechar</button>
        </div>
      {/if}
      {#if workspace.pendingMove}
        <div class="conflict-banner">
          <span>mover "{workspace.pendingMove.noteName}" para {workspace.pendingMove.destName}?</span>
          <button onclick={() => void workspace.confirmMove()}>mover</button>
          <button onclick={() => workspace.cancelMove()}>cancelar</button>
        </div>
      {/if}
    </main>

    {#if workspace.settingsOpen && !workspace.chromeHidden}
      <SettingsPanel {workspace} />
    {/if}
  </div>

  {#if !workspace.chromeHidden}
    <StatusBar {workspace} />
  {/if}

  {#if workspace.hud}
    {#key workspace.hud.id}
      <div class="hud eyebrow" role="status">{workspace.hud.label}</div>
    {/key}
  {/if}
</div>

<style>
  .app {
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  /* hairline superior com labels mono — motivo do brandbook; espaço à
     esquerda para os semáforos do macOS (titleBarStyle overlay) */
  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 var(--ab-space-4) 0 84px;
    height: 38px;
    border-bottom: var(--ab-border-soft);
    flex: none;
  }

  .muted {
    color: var(--ab-fg-muted);
  }

  .zen-drag {
    height: 38px;
    flex: none;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 3;
  }

  /* aviso efêmero de modo — canto inferior direito, some sozinho */
  .hud {
    position: absolute;
    right: var(--ab-space-4);
    bottom: 46px;
    background: var(--ab-fg);
    color: var(--ab-bg);
    padding: var(--ab-space-2) var(--ab-space-3);
    pointer-events: none;
    z-index: 20;
    animation: hud-life 1.7s var(--ab-ease) both;
  }

  @keyframes hud-life {
    0% {
      opacity: 0;
      transform: translateY(4px);
    }
    10%,
    80% {
      opacity: 1;
      transform: translateY(0);
    }
    100% {
      opacity: 0;
      transform: translateY(0);
    }
  }

  .body {
    flex: 1;
    display: flex;
    min-height: 0;
  }

  .editor-area {
    flex: 1;
    min-width: 0;
    position: relative;
    display: flex;
  }

  .editor-host {
    flex: 1;
    min-width: 0;
    display: flex;
  }

  .editor-host.hidden {
    visibility: hidden;
  }

  .empty {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--ab-space-4);
    z-index: 1;
  }

  .empty-title {
    font-family: var(--ab-font-display);
    font-weight: var(--ab-w-thin);
    font-size: clamp(48px, 8vw, 96px);
    letter-spacing: var(--ab-tracking-tight);
    line-height: var(--ab-leading-tight);
  }

  .empty-sub {
    color: var(--ab-fg-muted);
    font-size: var(--ab-size-small);
  }

  .cta {
    font-family: var(--ab-font-mono);
    font-size: var(--ab-size-small);
    letter-spacing: var(--ab-tracking-wide);
    text-transform: uppercase;
    border: var(--ab-border-hair);
    padding: var(--ab-space-3) var(--ab-space-5);
    transition:
      background var(--ab-dur-fast) var(--ab-ease-quick),
      color var(--ab-dur-fast) var(--ab-ease-quick);
  }

  .cta:hover {
    background: var(--ab-fg);
    color: var(--ab-bg);
  }

  .cta:active {
    transform: scale(0.98);
    opacity: 0.9;
  }

  .conflict-banner {
    position: absolute;
    bottom: var(--ab-space-4);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: var(--ab-space-4);
    align-items: center;
    background: var(--ab-fg);
    color: var(--ab-bg);
    padding: var(--ab-space-3) var(--ab-space-4);
    font-size: var(--ab-size-small);
    max-width: 80%;
    z-index: 2;
  }

  .conflict-banner button {
    color: inherit;
    text-transform: uppercase;
    font-size: var(--ab-size-eyebrow);
    letter-spacing: var(--ab-tracking-wide);
    text-decoration: underline;
  }
</style>
