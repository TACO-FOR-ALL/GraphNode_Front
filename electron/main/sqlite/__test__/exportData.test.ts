export {};

const mockShowOpenDialog = jest.fn();
const mockMkdir = jest.fn();
const mockWriteFile = jest.fn();

jest.mock("electron", () => ({
  dialog: {
    showOpenDialog: (...args: unknown[]) => mockShowOpenDialog(...args),
  },
}));

jest.mock("node:fs/promises", () => ({
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
}));

describe("exportData", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
  });

  test("exportSQLiteNotesToDirectory returns canceled when directory selection is canceled", async () => {
    mockShowOpenDialog.mockResolvedValue({
      canceled: true,
      filePaths: [],
    });

    const { exportSQLiteNotesToDirectory } = await import("../exportData");
    const result = await exportSQLiteNotesToDirectory([]);

    expect(result).toEqual({ canceled: true });
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  test("exportSQLiteNotesToDirectory writes markdown files with sanitized names", async () => {
    mockShowOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: ["/tmp/graphnode-export"],
    });

    const { exportSQLiteNotesToDirectory } = await import("../exportData");
    const result = await exportSQLiteNotesToDirectory([
      {
        id: "note-12345678",
        title: "My First Note!!!",
        content: "# Hello",
        folderId: null,
        createdAt: 1,
        updatedAt: 2,
      },
    ]);

    expect(result).toEqual({
      canceled: false,
      directory: "/tmp/graphnode-export",
      count: 1,
    });
    expect(mockMkdir).toHaveBeenCalledWith("/tmp/graphnode-export", {
      recursive: true,
    });
    expect(mockWriteFile).toHaveBeenCalledWith(
      "/tmp/graphnode-export/my-first-note-note-123.md",
      "# Hello",
      "utf-8",
    );
  });

  test("exportSQLiteThreadsToDirectory writes conversations.json with a threads array", async () => {
    mockShowOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: ["/tmp/chat-export"],
    });

    const { exportSQLiteThreadsToDirectory } = await import("../exportData");
    const result = await exportSQLiteThreadsToDirectory([
      {
        id: "thread-1",
        title: "Conversation 1",
        updatedAt: 10,
        messages: [
          {
            id: "msg-1",
            role: "user",
            content: "Hello",
            ts: 10,
          },
        ],
      },
    ]);

    expect(result).toEqual({
      canceled: false,
      directory: "/tmp/chat-export",
      filePath: "/tmp/chat-export/conversations.json",
      count: 1,
    });
    expect(mockWriteFile).toHaveBeenCalledTimes(1);

    const [, writtenJson] = mockWriteFile.mock.calls[0];
    const parsed = JSON.parse(writtenJson);
    expect(Array.isArray(parsed.threads)).toBe(true);
    expect(parsed.threads[0]).toEqual(
      expect.objectContaining({
        id: "thread-1",
        title: "Conversation 1",
      }),
    );
  });
});
