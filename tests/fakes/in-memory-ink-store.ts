import type { InkStore } from "../../src/application/ports/ink-store";

/** Fake em memória do lateral de tinta; conta gravações para os testes. */
export class InMemoryInkStore implements InkStore {
  files = new Map<string, string>();
  saves = 0;

  async load(_root: string, notePath: string): Promise<string | null> {
    return this.files.get(notePath) ?? null;
  }

  async save(_root: string, notePath: string, content: string | null): Promise<void> {
    this.saves++;
    if (content === null) this.files.delete(notePath);
    else this.files.set(notePath, content);
  }

  async move(_root: string, from: string, to: string): Promise<void> {
    for (const [path, content] of [...this.files]) {
      if (path === from || path.startsWith(`${from}/`)) {
        this.files.delete(path);
        this.files.set(to + path.slice(from.length), content);
      }
    }
  }

  async trash(_root: string, path: string): Promise<void> {
    for (const key of [...this.files.keys()]) {
      if (key === path || key.startsWith(`${path}/`)) this.files.delete(key);
    }
  }
}
