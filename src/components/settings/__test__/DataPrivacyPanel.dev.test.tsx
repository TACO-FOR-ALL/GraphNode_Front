import React from "react";
import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import DataPrivacyPanel from "../DataPrivacyPanel";

const mockInvalidateQueries = jest.fn();
const mockDeleteAllConversations = jest.fn();
const mockDeleteAllNotes = jest.fn();
const mockDeleteAllFolders = jest.fn();
const mockBulkCreateConversations = jest.fn();
const mockGetThreadList = jest.fn();
const mockClearThreads = jest.fn();
const mockUpsertManyThreads = jest.fn();
const mockGetAllNotes = jest.fn();
const mockClearNotes = jest.fn();
const mockUpsertManyNotes = jest.fn();
const mockListFolders = jest.fn();
const mockClearFolders = jest.fn();
const mockUpsertManyFolders = jest.fn();
const mockBulkCreateNotes = jest.fn();
const mockListServerFolders = jest.fn();
const mockClearThreadsTrash = jest.fn();
const mockClearNotesAndFoldersTrash = jest.fn();
const mockDeleteSQLiteOutboxByEntityType = jest.fn();
const mockExportSQLiteNotesToDirectory = jest.fn();
const mockExportSQLiteThreadsToDirectory = jest.fn();
const mockGetCliInstallStatus = jest.fn();
const mockInstallBundledCli = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: (...args: unknown[]) => mockInvalidateQueries(...args),
  }),
}));

jest.mock("../DropJsonZone", () => () => React.createElement("div", null, "DropJsonZone"));
jest.mock("../DropMdZone", () => () => React.createElement("div", null, "DropMdZone"));
jest.mock("../TrashPanel", () => () => React.createElement("div", null, "TrashPanel"));
jest.mock("../SettingsPanelLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
}));

jest.mock("@/store/useOnboardingStore", () => ({
  useOnboardingStore: () => ({
    resetOnboarding: jest.fn(),
    startOnboarding: jest.fn(),
  }),
}));

jest.mock("@/store/useChangelogStore", () => ({
  useChangelogStore: () => ({
    resetLastSeenVersion: jest.fn(),
    setModalOpen: jest.fn(),
  }),
}));

jest.mock("@/store/useToastStore", () => ({
  useToastStore: () => ({
    addToast: jest.fn(),
  }),
}));

jest.mock("@/utils/platform", () => ({
  isElectron: jest.fn(() => true),
}));

jest.mock("@/apiClient", () => ({
  api: {
    conversations: {
      list: jest.fn(async () => ({ isSuccess: true, data: [] })),
      bulkCreate: (...args: unknown[]) => mockBulkCreateConversations(...args),
      deleteAll: (...args: unknown[]) => mockDeleteAllConversations(...args),
    },
    note: {
      listNotes: jest.fn(async () => ({ isSuccess: true, data: [] })),
      bulkCreate: (...args: unknown[]) => mockBulkCreateNotes(...args),
      listFolders: (...args: unknown[]) => mockListServerFolders(...args),
      deleteAllNotes: (...args: unknown[]) => mockDeleteAllNotes(...args),
      deleteAllFolders: (...args: unknown[]) => mockDeleteAllFolders(...args),
    },
    graphAi: {
      generateGraph: jest.fn(async () => ({ isSuccess: true, data: null })),
      requestSummary: jest.fn(async () => ({ isSuccess: true, data: null })),
      getSummary: jest.fn(async () => ({ isSuccess: true, data: null })),
      deleteGraph: jest.fn(async () => ({ isSuccess: true, data: null })),
    },
    graph: {
      getSnapshot: jest.fn(async () => ({ isSuccess: true, data: null })),
    },
  },
}));

jest.mock("@/managers/threadRepo", () => ({
  threadRepo: {
    getThreadList: (...args: unknown[]) => mockGetThreadList(...args),
    clearAll: (...args: unknown[]) => mockClearThreads(...args),
    upsertMany: (...args: unknown[]) => mockUpsertManyThreads(...args),
  },
}));

jest.mock("@/managers/noteRepo", () => ({
  noteRepo: {
    getAllNotes: (...args: unknown[]) => mockGetAllNotes(...args),
    clearAll: (...args: unknown[]) => mockClearNotes(...args),
    upsertMany: (...args: unknown[]) => mockUpsertManyNotes(...args),
  },
}));

jest.mock("@/managers/folderRepo", () => ({
  folderRepo: {
    getFolderList: (...args: unknown[]) => mockListFolders(...args),
    clearAll: (...args: unknown[]) => mockClearFolders(...args),
    upsertMany: (...args: unknown[]) => mockUpsertManyFolders(...args),
  },
}));

jest.mock("@/managers/trashRepo", () => ({
  trashRepo: {
    clearThreadsTrash: (...args: unknown[]) => mockClearThreadsTrash(...args),
    clearNotesAndFoldersTrash: (...args: unknown[]) =>
      mockClearNotesAndFoldersTrash(...args),
  },
}));

describe("DataPrivacyPanel developer tools", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    mockDeleteAllConversations.mockResolvedValue({ isSuccess: true, data: null });
    mockDeleteAllNotes.mockResolvedValue({ isSuccess: true, data: null });
    mockDeleteAllFolders.mockResolvedValue({ isSuccess: true, data: null });
    mockBulkCreateConversations.mockResolvedValue({
      isSuccess: true,
      statusCode: 200,
      data: { conversations: [] },
    });
    mockGetThreadList.mockResolvedValue([]);
    mockGetThreadList.mockResolvedValue([
      { id: "thread-1", title: "Chat 1", messages: [], updatedAt: 1 },
    ]);
    mockClearThreads.mockResolvedValue(undefined);
    mockUpsertManyThreads.mockResolvedValue(undefined);
    mockGetAllNotes.mockResolvedValue([
      {
        id: "note-1",
        title: "Note 1",
        content: "# Note 1",
        folderId: null,
        createdAt: 1,
        updatedAt: 1,
      },
    ]);
    mockClearNotes.mockResolvedValue(undefined);
    mockUpsertManyNotes.mockResolvedValue(undefined);
    mockListFolders.mockResolvedValue([]);
    mockClearFolders.mockResolvedValue(undefined);
    mockUpsertManyFolders.mockResolvedValue(undefined);
    mockBulkCreateNotes.mockResolvedValue({
      isSuccess: true,
      statusCode: 200,
      data: { notes: [] },
    });
    mockListServerFolders.mockResolvedValue({
      isSuccess: true,
      statusCode: 200,
      data: [],
    });
    mockClearThreadsTrash.mockResolvedValue(undefined);
    mockClearNotesAndFoldersTrash.mockResolvedValue(undefined);
    mockDeleteSQLiteOutboxByEntityType.mockResolvedValue({ ok: true, count: 0 });
    mockExportSQLiteNotesToDirectory.mockResolvedValue({
      canceled: false,
      directory: "/tmp/export",
      count: 1,
    });
    mockExportSQLiteThreadsToDirectory.mockResolvedValue({
      canceled: false,
      directory: "/tmp/export",
      filePath: "/tmp/export/conversations.json",
      count: 1,
    });
    mockGetCliInstallStatus.mockResolvedValue({
      platform: "darwin",
      supported: true,
      cliEntryPath: "/tmp/cli/dist/index.js",
      installDir: "/Users/test/.local/bin",
      commandPath: "/Users/test/.local/bin/graphnode",
      isInstalled: false,
      pathConfigured: false,
      shellConfigPath: "/Users/test/.zprofile",
    });
    mockInstallBundledCli.mockResolvedValue({
      ok: true,
      platform: "darwin",
      cliEntryPath: "/tmp/cli/dist/index.js",
      installDir: "/Users/test/.local/bin",
      commandPath: "/Users/test/.local/bin/graphnode",
      pathUpdated: true,
      requiresNewTerminal: true,
      shellConfigPath: "/Users/test/.zprofile",
    });
    mockInvalidateQueries.mockResolvedValue(undefined);

    Object.defineProperty(globalThis, "__GRAPHNODE_TEST_DEVTOOLS__", {
      configurable: true,
      value: true,
      writable: true,
    });

    Object.defineProperty(window, "graphnodeAPI", {
      configurable: true,
      value: {
        getCliInstallStatus: mockGetCliInstallStatus,
        installBundledCli: mockInstallBundledCli,
        deleteSQLiteOutboxByEntityType: mockDeleteSQLiteOutboxByEntityType,
        exportSQLiteNotesToDirectory: mockExportSQLiteNotesToDirectory,
        exportSQLiteThreadsToDirectory: mockExportSQLiteThreadsToDirectory,
      },
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    delete (globalThis as { __GRAPHNODE_TEST_DEVTOOLS__?: boolean })
      .__GRAPHNODE_TEST_DEVTOOLS__;
    jest.clearAllMocks();
  });

  async function renderPanel() {
    await act(async () => {
      root.render(React.createElement(DataPrivacyPanel));
    });
  }

  function clickButtonByText(text: string) {
    const button = Array.from(container.querySelectorAll("button")).find(
      (node) => node.textContent?.includes(text),
    ) as HTMLButtonElement | undefined;

    if (!button) {
      throw new Error(`Button not found: ${text}`);
    }

    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }

  test("shows developer tools buttons when dev tools are enabled", async () => {
    await renderPanel();

    expect(container.textContent).toContain("Export My Data");
    expect(container.textContent).toContain("Export Notes");
    expect(container.textContent).toContain("Export Chats");
    expect(container.textContent).toContain("Developer Tools");
    expect(container.textContent).toContain("Force Sync");
    expect(container.textContent).toContain("force sync chat");
    expect(container.textContent).toContain("force sync notes");
    expect(container.textContent).toContain("delete server, client chat");
    expect(container.textContent).toContain("delete server, client notes");
  });

  test("export notes sends all notes to the export bridge", async () => {
    await renderPanel();

    await act(async () => {
      clickButtonByText("Export Notes");
    });

    expect(mockGetAllNotes).toHaveBeenCalledTimes(1);
    expect(mockExportSQLiteNotesToDirectory).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "note-1",
        title: "Note 1",
      }),
    ]);
  });

  test("export chats writes conversations.json payload through the export bridge", async () => {
    await renderPanel();

    await act(async () => {
      clickButtonByText("Export Chats");
    });

    expect(mockGetThreadList).toHaveBeenCalledTimes(1);
    expect(mockExportSQLiteThreadsToDirectory).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "thread-1",
        title: "Chat 1",
      }),
    ]);
  });

  test("force sync chat by client uploads local chats to the server", async () => {
    mockGetThreadList.mockResolvedValueOnce([
      { id: "local-thread", title: "Local Chat", messages: [], updatedAt: 1 },
    ]);
    mockBulkCreateConversations.mockResolvedValueOnce({
      isSuccess: true,
      statusCode: 200,
      data: { conversations: [] },
    });
    await renderPanel();

    await act(async () => {
      clickButtonByText("force sync chat by client");
    });

    expect(mockBulkCreateConversations).toHaveBeenCalledWith({
      conversations: [
        {
          id: "local-thread",
          title: "Local Chat",
          messages: [],
        },
      ],
    });
    expect(mockUpsertManyThreads).not.toHaveBeenCalled();
    expect(mockInvalidateQueries).not.toHaveBeenCalledWith({
      queryKey: ["chatThreads"],
    });
  });

  test("force sync notes uploads local-only notes and pulls server-only notes/folders", async () => {
    mockGetAllNotes.mockResolvedValueOnce([
      {
        id: "local-note",
        title: "Local Note",
        content: "# Local Note",
        folderId: null,
        createdAt: 1,
        updatedAt: 1,
      },
    ]);
    mockListFolders.mockResolvedValueOnce([]);
    mockBulkCreateNotes.mockResolvedValueOnce({
      isSuccess: true,
      statusCode: 200,
      data: { notes: [] },
    });
    mockListServerFolders.mockResolvedValueOnce({
      isSuccess: true,
      statusCode: 200,
      data: [
        {
          id: "server-folder",
          name: "Server Folder",
          parentId: null,
          createdAt: new Date(3).toISOString(),
          updatedAt: new Date(3).toISOString(),
        },
      ],
    });
    const { api } = jest.requireMock("@/apiClient") as {
      api: { note: { listNotes: jest.Mock } };
    };
    api.note.listNotes.mockResolvedValueOnce({
      isSuccess: true,
      statusCode: 200,
      data: [
        {
          id: "server-note",
          title: "Server Note",
          content: "# Server Note",
          folderId: "server-folder",
          createdAt: new Date(4).toISOString(),
          updatedAt: new Date(4).toISOString(),
        },
      ],
    });

    await renderPanel();

    await act(async () => {
      clickButtonByText("force sync notes");
    });

    expect(mockBulkCreateNotes).toHaveBeenCalledWith({
      notes: [
        {
          id: "local-note",
          title: "Local Note",
          content: "# Local Note",
          folderId: null,
        },
      ],
    });
    expect(mockUpsertManyFolders).toHaveBeenCalledWith([
      expect.objectContaining({ id: "server-folder", name: "Server Folder" }),
    ]);
    expect(mockUpsertManyNotes).toHaveBeenCalledWith([
      expect.objectContaining({ id: "server-note", title: "Server Note" }),
    ]);
  });

  test("delete server, client chat clears local SQLite state and server chats", async () => {
    await renderPanel();

    await act(async () => {
      clickButtonByText("delete server, client chat");
    });

    expect(mockClearThreads).toHaveBeenCalledTimes(1);
    expect(mockClearThreadsTrash).toHaveBeenCalledTimes(1);
    expect(mockDeleteSQLiteOutboxByEntityType).toHaveBeenCalledWith("thread");
    expect(mockDeleteAllConversations).toHaveBeenCalledTimes(1);
  });

  test("delete server, client notes clears local SQLite notes/folders and server notes", async () => {
    await renderPanel();

    await act(async () => {
      clickButtonByText("delete server, client notes");
    });

    expect(mockClearNotes).toHaveBeenCalledTimes(1);
    expect(mockClearFolders).toHaveBeenCalledTimes(1);
    expect(mockClearNotesAndFoldersTrash).toHaveBeenCalledTimes(1);
    expect(mockDeleteSQLiteOutboxByEntityType).toHaveBeenCalledWith("note");
    expect(mockDeleteSQLiteOutboxByEntityType).toHaveBeenCalledWith("folder");
    expect(mockDeleteAllNotes).toHaveBeenCalledTimes(1);
    expect(mockDeleteAllFolders).toHaveBeenCalledTimes(1);
  });
});
