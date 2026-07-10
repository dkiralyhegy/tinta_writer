/** Nó da árvore da biblioteca: pasta (projeto/livro) ou nota (.md/.txt). */
export interface LibraryNode {
  name: string;
  path: string;
  isDir: boolean;
  mtimeMs: number;
  children: LibraryNode[];
}

export interface Library {
  rootPath: string;
  root: LibraryNode;
}

/** Nome da pasta de notas diárias dentro da raiz da biblioteca. */
export const DAILY_DIR = "daily";

export function flattenNotes(node: LibraryNode): LibraryNode[] {
  if (!node.isDir) return [node];
  return node.children.flatMap(flattenNotes);
}

export function findNode(node: LibraryNode, path: string): LibraryNode | null {
  if (node.path === path) return node;
  for (const child of node.children) {
    const found = findNode(child, path);
    if (found) return found;
  }
  return null;
}
