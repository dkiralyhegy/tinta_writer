import { invoke } from "@tauri-apps/api/core";
import type { InkStore } from "../../application/ports/ink-store";

/** Adapter da porta InkStore sobre os commands Rust de tinta. */
export class TauriInkStore implements InkStore {
  load(root: string, notePath: string): Promise<string | null> {
    return invoke<string | null>("read_ink", { root, path: notePath });
  }

  save(root: string, notePath: string, content: string | null): Promise<void> {
    return invoke("write_ink", { root, path: notePath, content });
  }

  move(root: string, from: string, to: string): Promise<void> {
    return invoke("move_ink", { root, from, to });
  }

  trash(root: string, path: string): Promise<void> {
    return invoke("trash_ink", { root, path });
  }
}
