/**
 * Eventos mecânicos da máquina de escrever a partir de uma edição: o que
 * soa e o que anima. Puro — a camada de editor mede o cursor e chama.
 */
export type CarriageEvent = "key" | "space" | "backspace" | "return" | "bell" | "linefeed";

export interface CaretSnapshot {
  /** topo da linha visual (px, arredondado) — identidade da linha */
  line: number;
  /** caracteres desde o início da linha visual */
  col: number;
}

export type CarriageAction = "insert" | "delete" | "move";

/** coluna 65 menos 6: o sino avisa que a margem está chegando */
export const BELL_COLUMN = 59;

export function carriageEvents(input: {
  action: CarriageAction;
  text: string;
  prev: CaretSnapshot;
  next: CaretSnapshot;
  bellRung: boolean;
}): { events: CarriageEvent[]; bellRung: boolean } {
  const { action, text, prev, next } = input;
  const lineChanged = next.line !== prev.line;
  let bellRung = lineChanged ? false : input.bellRung;
  const events: CarriageEvent[] = [];

  if (action === "move") return { events, bellRung };
  if (action === "delete") return { events: ["backspace"], bellRung };

  if (text.includes("\n")) {
    events.push("return", "linefeed");
  } else {
    events.push(text === " " ? "space" : "key");
    if (lineChanged) events.push("return", "linefeed");
  }
  if (!bellRung && next.col >= BELL_COLUMN) {
    events.push("bell");
    bellRung = true;
  }
  return { events, bellRung };
}
