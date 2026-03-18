import React from "react";
import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import DataPrivacyPanel from "../DataPrivacyPanel";

const mockDeleteAllConversations = jest.fn();
const mockDeleteAllNotes = jest.fn();
const mockDeleteAllFolders = jest.fn();
const mockGetThreadList = jest.fn();
const mockClearThreads = jest.fn();
const mockGetAllNotes = jest.fn();
const mockClearNotes = jest.fn();
const mockClearFolders = jest.fn();
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

jest.mock("@/apiClient", () => ({
  api: {
    conversations: {
      list: jest.fn(async () => ({ isSuccess: true, data: [] })),
      deleteAll: (...args: unknown[]) => mockDeleteAllConversations(...args),
    },
    note: {
      listNotes: jest.fn(async () => ({ isSuccess: true, data: [] })),
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
  },
}));

jest.mock("@/managers/noteRepo", () => ({
  noteRepo: {
    getAllNotes: (...args: unknown[]) => mockGetAllNotes(...args),
    clearAll: (...args: unknown[]) => mockClearNotes(...args),
  },
}));

jest.mock("@/managers/folderRepo", () => ({
  folderRepo: {
    clearAll: (...args: unknown[]) => mockClearFolders(...args),
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
    mockGetThreadList.mockResolvedValue([]);
    mockGetThreadList.mockResolvedValue([
      { id: "thread-1", title: "Chat 1", messages: [], updatedAt: 1 },
    ]);
    mockClearThreads.mockResolvedValue(undefined);
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
    mockClearFolders.mockResolvedValue(undefined);
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
      (node) => node.textContent?.trim() === text,
    ) as HTMLButtonElement | undefined;

    if (!button) {
      throw new Error(`Button not found: ${text}`);
    }

    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }

  test("shows developer tools buttons when dev tools are enabled", async () => {
    await renderPanel();

    expect(container.textContent).toContain("Export My Data");
    expect(container.textContent).toContain("Terminal CLI");
    expect(container.textContent).toContain("Install CLI");
    expect(container.textContent).toContain("Export Notes");
    expect(container.textContent).toContain("Export Chats");
    expect(container.textContent).toContain("Developer Tools");
    expect(container.textContent).toContain("delete server, client chat");
    expect(container.textContent).toContain("delete server, client notes");
  });

  test("install cli calls the graphnode install bridge", async () => {
    mockGetCliInstallStatus
      .mockResolvedValueOnce({
        platform: "darwin",
        supported: true,
        cliEntryPath: "/tmp/cli/dist/index.js",
        installDir: "/Users/test/.local/bin",
        commandPath: "/Users/test/.local/bin/graphnode",
        isInstalled: false,
        pathConfigured: false,
        shellConfigPath: "/Users/test/.zprofile",
      })
      .mockResolvedValueOnce({
        platform: "darwin",
        supported: true,
        cliEntryPath: "/tmp/cli/dist/index.js",
        installDir: "/Users/test/.local/bin",
        commandPath: "/Users/test/.local/bin/graphnode",
        isInstalled: true,
        pathConfigured: true,
        shellConfigPath: "/Users/test/.zprofile",
      });

    await renderPanel();

    await act(async () => {
      clickButtonByText("Install CLI");
    });

    expect(mockGetCliInstallStatus).toHaveBeenCalledTimes(2);
    expect(mockInstallBundledCli).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("Installed");
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
