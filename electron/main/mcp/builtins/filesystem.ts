import { MCPServerConfig, MCPServerSettings } from "../types";

// @modelcontextprotocol/server-filesystem 패키지 사용
// npm install @modelcontextprotocol/server-filesystem
export function getFilesystemConfig(
  settings?: MCPServerSettings,
): Partial<MCPServerConfig> {
  const allowedPaths = settings?.allowedPaths || [];

  return {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", ...allowedPaths],
    env: {},
  };
}

// Filesystem 서버가 지원하는 도구들
export const FILESYSTEM_TOOLS = [
  {
    name: "read_file",
    description: "Read the complete contents of a file",
  },
  {
    name: "read_multiple_files",
    description: "Read the contents of multiple files",
  },
  {
    name: "write_file",
    description: "Write content to a file",
  },
  {
    name: "create_directory",
    description: "Create a new directory",
  },
  {
    name: "list_directory",
    description: "List contents of a directory",
  },
  {
    name: "move_file",
    description: "Move or rename a file",
  },
  {
    name: "search_files",
    description: "Search for files by pattern",
  },
  {
    name: "get_file_info",
    description: "Get detailed information about a file",
  },
  {
    name: "list_allowed_directories",
    description: "List directories the server can access",
  },
];
