/**
 * Composition root — o único lugar que conhece todas as camadas.
 * Instancia adapters de infraestrutura, injeta nos use cases (via
 * Workspace) e monta a UI. Sem container de DI, sem mágica.
 */
import { mount } from "svelte";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";

import "./ui/styles/fonts.css";
import "./ui/styles/tokens.css";
import "./ui/styles/app.css";
import "./ui/styles/style-transparent.css";
import "./ui/styles/style-paper.css";
import "./ui/styles/style-typewriter-real.css";

import { systemClock } from "./application/ports/clock";
import { ProgressTracker } from "./application/use-cases/track-progress";
import { WebAudioTypewriterSounds } from "./infrastructure/audio/typewriter-sounds";
import { TauriInkStore } from "./infrastructure/tauri/tauri-ink-store";
import { TauriWindowAppearance } from "./infrastructure/tauri/tauri-window-appearance";
import { TauriNoteRepository } from "./infrastructure/tauri/tauri-note-repository";
import { TauriSettingsStore } from "./infrastructure/tauri/tauri-settings-store";
import { TauriStatsStore } from "./infrastructure/tauri/tauri-stats-store";
import App from "./ui/App.svelte";
import { Workspace } from "./ui/stores/workspace.svelte";

const repo = new TauriNoteRepository();
const settingsStore = new TauriSettingsStore();
const statsStore = new TauriStatsStore();
const tracker = new ProgressTracker(statsStore, systemClock);

const workspace = new Workspace({
  repo,
  settingsStore,
  tracker,
  clock: systemClock,
  windowAppearance: new TauriWindowAppearance(),
  inkStore: new TauriInkStore(),
  sounds: new WebAudioTypewriterSounds(),
  pickFolder: async () => {
    const result = await open({ directory: true, multiple: false, title: "Escolher biblioteca" });
    return typeof result === "string" ? result : null;
  },
});

// fechar a janela força o flush do que estiver pendente — nada se perde
void getCurrentWindow().onCloseRequested(async () => {
  await workspace.flushAll();
});

void workspace.init();

mount(App, {
  target: document.getElementById("app")!,
  props: { workspace },
});
