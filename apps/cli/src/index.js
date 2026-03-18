import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import {
  getCliNotesDirectory,
  getGraphNodeHomeDirectory,
} from "@graphnode/paths";
import {
  getSQLiteNoteById,
  getSQLiteStatus,
  listSQLiteNotes,
  searchSQLiteNotes,
  softDeleteSQLiteNote,
  upsertSQLiteNote,
} from "@graphnode/storage";

const APP_NAME = "GraphNode CLI";
const VERSION = "0.1.0";

function printHelp() {
  console.log(
    [
      `${APP_NAME} v${VERSION}`,
      "",
      "Usage:",
      "  graphnode <command> [options]",
      "",
      "Commands:",
      "  help                 Show this help message",
      "  version              Show CLI version",
      "  doctor               Show local runtime information",
      "  demo                 Run a small demo workflow",
      "  sqlite status        Show SQLite bootstrap and note count",
      "  sqlite notes         List notes stored in SQLite",
      "  note add <title>     Create a SQLite-backed note",
      "  note list            List SQLite notes",
      "  note path <query>    Print the resolved SQLite note id",
      "  note show <query>    Print a SQLite note by id/title/content match",
      "  note search <query>  Search SQLite notes",
      "  note open <query>    Open a temp markdown preview for a SQLite note",
      "  note delete <query>  Soft-delete a SQLite note",
      "",
      "Examples:",
      "  graphnode doctor",
      "  graphnode sqlite status",
      "  graphnode sqlite notes",
      "  graphnode note add \"First note\"",
      "  graphnode note path first-note",
      "  graphnode note show first-note",
      "  graphnode note search note",
      "  graphnode note open first-note",
      "  graphnode note delete first-note",
      "  graphnode note list",
    ].join("\n"),
  );
}

function printVersion() {
  console.log(VERSION);
}

function runDoctor() {
  console.log(
    [
      `${APP_NAME} doctor`,
      `Platform: ${process.platform}`,
      `Node: ${process.version}`,
      `Home: ${os.homedir()}`,
      `Working directory: ${process.cwd()}`,
      `GraphNode home: ${getGraphNodeHomeDirectory()}`,
      `Notes directory: ${getCliNotesDirectory()}`,
    ].join("\n"),
  );
}

function runDemo() {
  console.log("GraphNode CLI demo");
  console.log("1. Create notes from terminal");
  console.log("2. Keep note files in a shared GraphNode home directory");
  console.log("3. Inspect SQLite startup sync state from the same CLI");
}

async function showSQLiteStatus() {
  const status = await getSQLiteStatus();

  console.log("GraphNode SQLite status");
  console.log(`Database: ${status.databasePath}`);
  console.log(`Bootstrap: ${status.bootstrap?.state ?? "not_bootstrapped"}`);
  console.log(`Last server time: ${status.bootstrap?.lastServerTime ?? "n/a"}`);
  console.log(
    `Last bootstrapped at: ${status.bootstrap?.lastBootstrappedAt ?? "n/a"}`,
  );
  console.log(`Cursor: ${status.cursor?.serverTime ?? "n/a"}`);
  console.log(`Notes: ${status.counts.notes}`);
}

async function listSQLiteStoredNotes() {
  const notes = await listSQLiteNotes();

  if (notes.length === 0) {
    console.log("No SQLite notes yet.");
    return;
  }

  notes.forEach((note, index) => {
    console.log(
      `${index + 1}. ${note.title} (${note.id}) - ${new Date(note.updatedAt).toLocaleString()}`,
    );
  });
}

function makeSqliteTitle(content) {
  const firstLine = content
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return "Untitled";
  }

  return firstLine.replace(/^#+\s*/, "").trim() || "Untitled";
}

async function resolveSQLiteNote(query) {
  const notes = await searchSQLiteNotes(query);

  const exactId = await getSQLiteNoteById(query).catch(() => null);
  if (exactId) {
    return { status: "resolved", note: exactId };
  }

  if (notes.length === 0) {
    return { status: "not_found", matches: [] };
  }

  if (notes.length > 1) {
    return { status: "ambiguous", matches: notes };
  }

  return { status: "resolved", note: notes[0] };
}

async function addNote(title) {
  if (!title) {
    console.error('Missing title. Example: graphnode note add "First note"');
    process.exitCode = 1;
    return;
  }

  const timestamp = Date.now();
  const content = `# ${title}\n\nCreated: ${new Date(timestamp).toISOString()}\n`;
  const note = {
    id: `cli-${timestamp}`,
    title: makeSqliteTitle(content),
    content,
    folderId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await upsertSQLiteNote(note);
  console.log(`Saved SQLite note: ${note.id}`);
}

async function listNotes() {
  const notes = await listSQLiteNotes();

  if (notes.length === 0) {
    console.log("No notes yet.");
    return;
  }

  notes.forEach((note, index) => {
    console.log(`${index + 1}. ${note.title} (${note.id})`);
  });
}

async function showNote(query) {
  if (!query) {
    console.error('Missing query. Example: graphnode note show "first-note"');
    process.exitCode = 1;
    return;
  }

  const resolution = await resolveSQLiteNote(query);

  if (resolution.status === "ambiguous") {
    console.error(`Multiple notes matched: ${query}`);
    resolution.matches.forEach((match) =>
      console.error(`- ${match.title} (${match.id})`),
    );
    process.exitCode = 1;
    return;
  }

  const note = resolution.status === "resolved" ? resolution.note : null;

  if (!note) {
    console.error(`No note found for query: ${query}`);
    process.exitCode = 1;
    return;
  }

  console.log(`# Note: ${note.title} (${note.id})`);
  console.log("");
  console.log(note.content);
}

async function printNotePath(query) {
  if (!query) {
    console.error('Missing query. Example: graphnode note path "first-note"');
    process.exitCode = 1;
    return;
  }

  const resolution = await resolveSQLiteNote(query);

  if (resolution.status === "not_found") {
    console.error(`No note found for query: ${query}`);
    process.exitCode = 1;
    return;
  }

  if (resolution.status === "ambiguous") {
    console.error(`Multiple notes matched: ${query}`);
    resolution.matches.forEach((match) =>
      console.error(`- ${match.title} (${match.id})`),
    );
    process.exitCode = 1;
    return;
  }

  console.log(resolution.note.id);
}

async function searchNotes(query) {
  if (!query) {
    console.error('Missing query. Example: graphnode note search "note"');
    process.exitCode = 1;
    return;
  }

  const matches = await searchSQLiteNotes(query);

  if (matches.length === 0) {
    console.log(`No notes matched: ${query}`);
    return;
  }

  matches.forEach((note, index) => {
    console.log(`${index + 1}. ${note.title} (${note.id})`);
  });
}

async function removeNote(query) {
  if (!query) {
    console.error('Missing query. Example: graphnode note delete "first-note"');
    process.exitCode = 1;
    return;
  }

  const result = await resolveSQLiteNote(query);

  if (result.status === "not_found") {
    console.error(`No note found for query: ${query}`);
    process.exitCode = 1;
    return;
  }

  if (result.status === "ambiguous") {
    console.error(`Multiple notes matched: ${query}`);
    result.matches.forEach((match) =>
      console.error(`- ${match.title} (${match.id})`),
    );
    process.exitCode = 1;
    return;
  }

  await softDeleteSQLiteNote(result.note.id);
  console.log(`Deleted SQLite note: ${result.note.id}`);
}

async function openNote(query) {
  if (!query) {
    console.error('Missing query. Example: graphnode note open "first-note"');
    process.exitCode = 1;
    return;
  }

  const result = await resolveSQLiteNote(query);

  if (result.status === "not_found") {
    console.error(`No note found for query: ${query}`);
    process.exitCode = 1;
    return;
  }

  if (result.status === "ambiguous") {
    console.error(`Multiple notes matched: ${query}`);
    result.matches.forEach((match) =>
      console.error(`- ${match.title} (${match.id})`),
    );
    process.exitCode = 1;
    return;
  }

  const previewPath = path.join(
    getCliNotesDirectory(),
    `sqlite-preview-${result.note.id}.md`,
  );
  await fs.mkdir(getCliNotesDirectory(), { recursive: true });
  await fs.writeFile(previewPath, result.note.content, "utf8");

  const platform = process.platform;
  const command =
    platform === "darwin"
      ? { file: "open", args: [previewPath] }
      : platform === "win32"
        ? { file: "cmd", args: ["/c", "start", "", previewPath] }
        : { file: "xdg-open", args: [previewPath] };

  await new Promise((resolve, reject) => {
    const child = spawn(command.file, command.args, {
      detached: true,
      stdio: "ignore",
    });
    child.on("error", reject);
    child.unref();
    resolve(undefined);
  });

  console.log(`Opened SQLite note preview: ${result.note.id}`);
}

async function main() {
  const [command, subcommand, ...rest] = process.argv.slice(2);

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "version" || command === "--version" || command === "-v") {
    printVersion();
    return;
  }

  if (command === "doctor") {
    runDoctor();
    return;
  }

  if (command === "demo") {
    runDemo();
    return;
  }

  if (command === "sqlite" && subcommand === "status") {
    await showSQLiteStatus();
    return;
  }

  if (command === "sqlite" && subcommand === "notes") {
    await listSQLiteStoredNotes();
    return;
  }

  if (command === "note" && subcommand === "add") {
    await addNote(rest.join(" "));
    return;
  }

  if (command === "note" && subcommand === "list") {
    await listNotes();
    return;
  }

  if (command === "note" && subcommand === "show") {
    await showNote(rest.join(" "));
    return;
  }

  if (command === "note" && subcommand === "path") {
    await printNotePath(rest.join(" "));
    return;
  }

  if (command === "note" && subcommand === "search") {
    await searchNotes(rest.join(" "));
    return;
  }

  if (command === "note" && subcommand === "open") {
    await openNote(rest.join(" "));
    return;
  }

  if (command === "note" && subcommand === "delete") {
    await removeNote(rest.join(" "));
    return;
  }

  console.error(`Unknown command: ${[command, subcommand].filter(Boolean).join(" ")}`);
  console.error('Run "graphnode help" to see available commands.');
  process.exitCode = 1;
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exitCode = 1;
});
