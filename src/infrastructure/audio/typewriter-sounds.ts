import type { TypewriterSoundPlayer } from "../../application/ports/typewriter-sounds";
import type { CarriageEvent } from "../../domain/services/carriage";

const FILES: Record<CarriageEvent, string[]> = {
  key: ["key-1", "key-2", "key-3", "key-4"],
  space: ["space"],
  backspace: ["backspace"],
  return: ["return"],
  bell: ["bell"],
  linefeed: ["ratchet"],
};

/**
 * Samples pré-carregados como AudioBuffer. Teclas sorteadas com tom ±5% e
 * volume ±15% para não soar repetitivo. Carrega só na primeira entrada no
 * estilo (o AudioContext nasce depois de um gesto do usuário — o ⌘E).
 */
export class WebAudioTypewriterSounds implements TypewriterSoundPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private loading: Promise<boolean> | null = null;
  private enabled = false;
  private volume = 0.6;

  configure(enabled: boolean, volume: number): void {
    this.enabled = enabled;
    this.volume = volume;
    if (this.master) this.master.gain.value = volume;
  }

  load(): Promise<boolean> {
    this.loading ??= this.loadAll();
    return this.loading;
  }

  private async loadAll(): Promise<boolean> {
    try {
      const ctx = new AudioContext();
      const master = ctx.createGain();
      master.gain.value = this.volume;
      master.connect(ctx.destination);
      this.ctx = ctx;
      this.master = master;
      const names = [...new Set(Object.values(FILES).flat())];
      await Promise.all(
        names.map(async (name) => {
          const res = await fetch(`/sounds/${name}.m4a`);
          if (!res.ok) throw new Error(`som ausente: ${name}`);
          this.buffers.set(name, await ctx.decodeAudioData(await res.arrayBuffer()));
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  play(event: CarriageEvent): void {
    const { ctx, master } = this;
    if (!this.enabled || !ctx || !master) return;
    if (ctx.state === "suspended") void ctx.resume();
    const options = FILES[event];
    const buffer = this.buffers.get(options[Math.floor(Math.random() * options.length)]!);
    if (!buffer) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    if (event === "key") {
      source.playbackRate.value = 0.95 + Math.random() * 0.1;
      gain.gain.value = 0.85 + Math.random() * 0.3;
    }
    source.connect(gain).connect(master);
    source.start();
  }
}
