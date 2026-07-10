import { snapshotsToPrune } from "../../domain/services/snapshot-policy";
import type { Clock } from "../ports/clock";
import type { NoteRepository } from "../ports/note-repository";

/** Roda no startup: aplica a política de retenção sobre <root>/.snapshots. */
export async function pruneSnapshots(
  repo: NoteRepository,
  clock: Clock,
  rootPath: string,
): Promise<number> {
  const snapshots = await repo.listSnapshots(rootPath);
  const doomed = snapshotsToPrune(snapshots, Math.floor(clock.now().getTime() / 1000));
  if (doomed.length === 0) return 0;
  return repo.deleteSnapshots(rootPath, doomed);
}
