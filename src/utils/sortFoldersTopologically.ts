export function sortFoldersTopologically<T extends { id: string; parentId: string | null }>(folders: T[]): T[] {
  const map = new Map(folders.map((f) => [f.id, f]));
  const result: T[] = [];
  const visited = new Set<string>();

  function visit(folder: T) {
    if (visited.has(folder.id)) return;
    if (folder.parentId && map.has(folder.parentId)) {
      visit(map.get(folder.parentId)!);
    }
    visited.add(folder.id);
    result.push(folder);
  }

  for (const folder of folders) visit(folder);
  return result;
}
