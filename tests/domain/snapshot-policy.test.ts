import { describe, expect, it } from "vitest";
import {
  snapshotsToPrune,
  type SnapshotMeta,
} from "../../src/domain/services/snapshot-policy";

const DAY = 24 * 60 * 60;
const NOW = 1_800_000_000; // segundos, arbitrário

function snap(noteRel: string, ageSecs: number): SnapshotMeta {
  const ts = NOW - ageSecs;
  return { path: `.snapshots/${noteRel}/${ts}.md`, noteRel, tsSecs: ts };
}

describe("snapshotsToPrune", () => {
  it("mantém tudo das últimas 24h", () => {
    const snaps = [snap("cap1.md", 60), snap("cap1.md", 3600), snap("cap1.md", DAY - 10)];
    expect(snapshotsToPrune(snaps, NOW)).toEqual([]);
  });

  it("na janela de 30 dias mantém só o mais recente de cada dia por nota", () => {
    const morning = snap("cap1.md", 2 * DAY + 3600 * 8);
    const evening = snap("cap1.md", 2 * DAY + 3600 * 2); // mesmo dia, mais recente
    const otherNote = snap("cap2.md", 2 * DAY + 3600 * 5); // outra nota, mantém
    const doomed = snapshotsToPrune([morning, evening, otherNote], NOW);
    expect(doomed).toEqual([morning.path]);
  });

  it("apaga tudo com mais de 30 dias", () => {
    const old1 = snap("cap1.md", 31 * DAY);
    const old2 = snap("cap2.md", 90 * DAY);
    const recent = snap("cap1.md", 3600);
    const doomed = snapshotsToPrune([old1, old2, recent], NOW);
    expect(doomed).toContain(old1.path);
    expect(doomed).toContain(old2.path);
    expect(doomed).not.toContain(recent.path);
  });

  it("lista vazia", () => {
    expect(snapshotsToPrune([], NOW)).toEqual([]);
  });
});
