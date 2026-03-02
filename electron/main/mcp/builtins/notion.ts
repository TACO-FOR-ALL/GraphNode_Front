// Notion MCP 서버 설정
// 공식 패키지: @notionhq/notion-mcp-server
// 참고: https://github.com/makenotion/notion-mcp-server
import { MCPServerConfig, MCPServerSettings } from "../types";

export function getNotionConfig(
  settings?: MCPServerSettings
): Partial<MCPServerConfig> {
  const notionApiKey = settings?.notionApiKey || "";

  return {
    command: "npx",
    args: ["-y", "@notionhq/notion-mcp-server"],
    env: {
      NOTION_API_KEY: notionApiKey,
    },
  };
}

// Notion 서버 사용 가능 여부
export const NOTION_AVAILABLE = true;

// 설정이 필요한지 확인
export function isNotionConfigured(settings?: MCPServerSettings): boolean {
  return !!settings?.notionApiKey;
}

// Notion 서버가 지원하는 도구들
export const NOTION_TOOLS = [
  {
    name: "notion_search",
    description: "Search for pages in Notion workspace",
  },
  {
    name: "notion_get_page",
    description: "Get a Notion page by ID",
  },
  {
    name: "notion_create_page",
    description: "Create a new Notion page",
  },
  {
    name: "notion_update_page",
    description: "Update a Notion page",
  },
  {
    name: "notion_query_database",
    description: "Query a Notion database",
  },
];
