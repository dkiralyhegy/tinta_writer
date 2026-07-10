import { describe, expect, it } from "vitest";
import { Autosave, type AutosaveTimers } from "../../src/application/use-cases/autosave";

/** Timers falsos controlados manualmente — sem relógio real no teste. */
class FakeTimers implements AutosaveTimers {
  private next = 1;
  pending = new Map<number, { fn: () => void; ms: number }>();

  set(fn: () => void, ms: number): ReturnType<typeof setTimeout> {
    const id = this.next++;
    this.pending.set(id, { fn, ms });
    return id as unknown as ReturnType<typeof setTimeout>;
  }

  clear(id: ReturnType<typeof setTimeout>): void {
    this.pending.delete(id as unknown as number);
  }

  fireAll(): void {
    const fns = [...this.pending.values()].map((p) => p.fn);
    this.pending.clear();
    fns.forEach((fn) => fn());
  }
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

describe("Autosave", () => {
  it("debounce: várias alterações agendam um único save", async () => {
    let saves = 0;
    const timers = new FakeTimers();
    const auto = new Autosave(async () => void saves++, 1000, timers);

    auto.markDirty();
    auto.markDirty();
    auto.markDirty();
    expect(timers.pending.size).toBe(1);

    timers.fireAll();
    await tick();
    expect(saves).toBe(1);
    expect(auto.isDirty).toBe(false);
  });

  it("flushNow salva imediatamente e cancela o timer", async () => {
    let saves = 0;
    const timers = new FakeTimers();
    const auto = new Autosave(async () => void saves++, 1000, timers);

    auto.markDirty();
    await auto.flushNow();
    expect(saves).toBe(1);
    expect(timers.pending.size).toBe(0);
  });

  it("flushNow sem alteração pendente não salva", async () => {
    let saves = 0;
    const auto = new Autosave(async () => void saves++, 1000, new FakeTimers());
    await auto.flushNow();
    expect(saves).toBe(0);
  });

  it("falha no save mantém o estado sujo para nova tentativa", async () => {
    let attempts = 0;
    const auto = new Autosave(
      async () => {
        attempts++;
        throw new Error("disco cheio");
      },
      1000,
      new FakeTimers(),
    );

    auto.markDirty();
    await expect(auto.flushNow()).rejects.toThrow("disco cheio");
    expect(auto.isDirty).toBe(true);
    expect(attempts).toBe(1);
  });
});
