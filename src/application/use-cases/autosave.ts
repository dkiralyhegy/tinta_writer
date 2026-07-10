type TimerId = ReturnType<typeof setTimeout>;

export interface AutosaveTimers {
  set(fn: () => void, ms: number): TimerId;
  clear(id: TimerId): void;
}

const realTimers: AutosaveTimers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (id) => clearTimeout(id),
};

/**
 * Política de autosave: debounce após a última alteração + flush imediato
 * sob demanda (blur, troca de nota, quit). O "como salvar" é injetado;
 * esta classe só decide "quando". Timers injetáveis para teste com clock fake.
 */
export class Autosave {
  private timer: TimerId | null = null;
  private dirty = false;
  private flushing: Promise<void> | null = null;

  constructor(
    private readonly doFlush: () => Promise<void>,
    private readonly delayMs = 1000,
    private readonly timers: AutosaveTimers = realTimers,
  ) {}

  /** Chamar a cada alteração de conteúdo. Reagenda o save. */
  markDirty(): void {
    this.dirty = true;
    if (this.timer !== null) this.timers.clear(this.timer);
    this.timer = this.timers.set(() => {
      this.timer = null;
      void this.flushNow();
    }, this.delayMs);
  }

  get isDirty(): boolean {
    return this.dirty;
  }

  /** Salva imediatamente se houver alteração pendente. Serializa flushes concorrentes. */
  async flushNow(): Promise<void> {
    if (this.timer !== null) {
      this.timers.clear(this.timer);
      this.timer = null;
    }
    if (this.flushing) await this.flushing;
    if (!this.dirty) return;
    this.dirty = false;
    this.flushing = this.doFlush().catch((err) => {
      // falha de save mantém o estado sujo para nova tentativa
      this.dirty = true;
      throw err;
    });
    try {
      await this.flushing;
    } finally {
      this.flushing = null;
    }
  }

  dispose(): void {
    if (this.timer !== null) {
      this.timers.clear(this.timer);
      this.timer = null;
    }
  }
}
