export {};

const mockAccess = jest.fn();
const mockMkdir = jest.fn();
const mockReadFile = jest.fn();
const mockWriteFile = jest.fn();
const mockChmod = jest.fn();
const mockExecFileSync = jest.fn();

jest.mock("electron", () => ({
  app: {
    getAppPath: () => "/Users/test/GraphNode_Front",
  },
}));

jest.mock("node:fs", () => ({
  constants: {
    F_OK: 0,
  },
  existsSync: (targetPath: string) =>
    targetPath.includes("/apps/cli/dist/index.js") ||
    targetPath.includes("\\cli\\dist\\index.js"),
}));

jest.mock("node:fs/promises", () => ({
  access: (...args: unknown[]) => mockAccess(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  readFile: (...args: unknown[]) => mockReadFile(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  chmod: (...args: unknown[]) => mockChmod(...args),
}));

jest.mock("node:child_process", () => ({
  execFileSync: (...args: unknown[]) => mockExecFileSync(...args),
}));

describe("installCli", () => {
  const originalPlatform = process.platform;
  const originalPath = process.env.PATH;
  const originalLocalAppData = process.env.LOCALAPPDATA;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockAccess.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue("");
    mockWriteFile.mockResolvedValue(undefined);
    mockChmod.mockResolvedValue(undefined);
    process.env.PATH = "/usr/bin:/bin";
    process.env.LOCALAPPDATA = "C:\\Users\\tester\\AppData\\Local";
  });

  afterAll(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform });
    process.env.PATH = originalPath;
    process.env.LOCALAPPDATA = originalLocalAppData;
  });

  test("installBundledCli writes mac wrapper and updates zprofile", async () => {
    Object.defineProperty(process, "platform", { value: "darwin" });

    const { installBundledCli } = await import("../installCli");
    const result = await installBundledCli();

    expect(result.commandPath).toContain("/.local/bin/graphnode");
    expect(result.pathUpdated).toBe(true);
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining("/.local/bin/graphnode"),
      expect.stringContaining('exec node "/Users/test/GraphNode_Front/apps/cli/dist/index.js" "$@"'),
      "utf-8",
    );
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining("/.zprofile"),
      expect.stringContaining('export PATH="$HOME/.local/bin:$PATH"'),
      "utf-8",
    );
    expect(mockChmod).toHaveBeenCalled();
  });

  test("installBundledCli writes windows wrapper and appends user path", async () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    mockExecFileSync
      .mockReturnValueOnce("")
      .mockReturnValueOnce(undefined);

    const { installBundledCli } = await import("../installCli");
    const result = await installBundledCli();

    expect(result.commandPath).toContain("graphnode.cmd");
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining("graphnode.cmd"),
      expect.stringContaining('node "/Users/test/GraphNode_Front/apps/cli/dist/index.js" %*'),
      "utf-8",
    );
    expect(mockExecFileSync).toHaveBeenCalledTimes(2);
  });
});
