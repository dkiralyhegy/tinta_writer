import { Effect, EffectState, getCurrentWindow } from "@tauri-apps/api/window";
import type { WindowBlur } from "../../domain/entities/theme-config";
import type { WindowAppearance } from "../../application/ports/window-appearance";

const MATERIAL: Record<Exclude<WindowBlur, "off">, Effect> = {
  light: Effect.Sidebar,
  strong: Effect.HudWindow,
};

/** Vibrancy do macOS via setEffects — exige transparent + macOSPrivateApi. */
export class TauriWindowAppearance implements WindowAppearance {
  private current: WindowBlur = "off";

  async setBlur(level: WindowBlur): Promise<void> {
    if (level === this.current) return;
    this.current = level;
    const win = getCurrentWindow();
    if (level === "off") {
      await win.clearEffects();
    } else {
      await win.setEffects({ effects: [MATERIAL[level]], state: EffectState.Active });
    }
  }
}
