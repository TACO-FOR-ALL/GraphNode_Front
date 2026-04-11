function trimTrailingWhitespace(line: string): string {
  return line.replace(/[ \t]+$/g, "");
}

function isFenceDelimiter(line: string): boolean {
  return /^(```|~~~)/.test(line.trim());
}

function getTableCells(line: string): string[] {
  const trimmed = line.trim();

  if (!trimmed.includes("|")) {
    return [];
  }

  const normalized = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  return normalized.split("|").map((cell) => cell.trim());
}

function isTableDividerLine(line: string): boolean {
  const cells = getTableCells(line);

  return (
    cells.length >= 2 &&
    cells.every((cell) => cell.length > 0 && /^:?-{3,}:?$/.test(cell))
  );
}

function isTableContentLine(line: string): boolean {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith(">")) {
    return false;
  }

  const cells = getTableCells(trimmed);
  return cells.length >= 2 && !isTableDividerLine(trimmed);
}

export default function normalizeTableMarkdown(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const result: string[] = [];
  let insideFence = false;

  for (let index = 0; index < lines.length; ) {
    const line = lines[index];

    if (isFenceDelimiter(line)) {
      insideFence = !insideFence;
      result.push(trimTrailingWhitespace(line));
      index += 1;
      continue;
    }

    if (insideFence || !isTableContentLine(line)) {
      result.push(trimTrailingWhitespace(line));
      index += 1;
      continue;
    }

    let dividerIndex = index + 1;
    while (dividerIndex < lines.length && lines[dividerIndex].trim() === "") {
      dividerIndex += 1;
    }

    if (
      dividerIndex >= lines.length ||
      !isTableDividerLine(lines[dividerIndex])
    ) {
      result.push(trimTrailingWhitespace(line));
      index += 1;
      continue;
    }

    result.push(trimTrailingWhitespace(line));
    result.push(trimTrailingWhitespace(lines[dividerIndex]));
    index = dividerIndex + 1;

    while (index < lines.length) {
      const currentLine = lines[index];

      if (currentLine.trim() === "") {
        let nextIndex = index + 1;
        while (nextIndex < lines.length && lines[nextIndex].trim() === "") {
          nextIndex += 1;
        }

        if (nextIndex < lines.length && isTableContentLine(lines[nextIndex])) {
          result.push(trimTrailingWhitespace(lines[nextIndex]));
          index = nextIndex + 1;
          continue;
        }

        break;
      }

      if (!isTableContentLine(currentLine)) {
        break;
      }

      result.push(trimTrailingWhitespace(currentLine));
      index += 1;
    }
  }

  return result.join("\n");
}
