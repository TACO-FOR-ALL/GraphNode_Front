export default function sortItemByDate<T extends { updatedAt: number }>(
  arr: T[]
): T[] {
  return [...arr].sort((a, b) => b.updatedAt - a.updatedAt);
}
