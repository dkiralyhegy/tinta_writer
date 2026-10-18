import type { CarriageEvent } from "../../domain/services/carriage";

/** Sons da máquina de escrever — Web Audio na infraestrutura. */
export interface TypewriterSoundPlayer {
  configure(enabled: boolean, volume: number): void;
  /** true se todos os samples carregaram */
  load(): Promise<boolean>;
  play(event: CarriageEvent): void;
}
