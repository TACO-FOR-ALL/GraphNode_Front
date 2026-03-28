import changelog from "@/data/changelog.json";

type ChangelogEntry = {
  date: string;
  model?: string;
  title: Record<string, string>;
  features: Record<string, string[]>;
  improvements: Record<string, string[]>;
};

// changelog.json에서 최신 버전의 model 필드를 반환
export function getChangelogModelName(): string | null {
  const entries = changelog as Record<string, ChangelogEntry>;

  const sortedVersions = Object.keys(entries).sort((a, b) => {
    const [aMajor, aMinor, aPatch] = a.split(".").map(Number);
    const [bMajor, bMinor, bPatch] = b.split(".").map(Number);
    if (bMajor !== aMajor) return bMajor - aMajor;
    if (bMinor !== aMinor) return bMinor - aMinor;
    return bPatch - aPatch;
  });

  for (const version of sortedVersions) {
    const entry = entries[version];
    if (entry.model) return entry.model;
  }
  return null;
}
