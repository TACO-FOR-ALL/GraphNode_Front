// Google Calendar MCP 서버 설정
// 패키지: @cocal/google-calendar-mcp
// 참고: https://github.com/nspady/google-calendar-mcp
//
// OAuth 인증이 필요합니다:
// 1. Google Cloud Console에서 OAuth 자격 증명 생성
// 2. GraphNode에서 "Setup OAuth" 클릭하여 인증 완료
import { MCPServerConfig, MCPServerSettings } from "../types";
import path from "path";
import { app } from "electron";

export function getGoogleCalendarConfig(
  settings?: MCPServerSettings
): Partial<MCPServerConfig> {
  // 인증된 경우 credentials 경로 사용 (공통 파일 사용)
  const credentialsDir = app?.getPath?.("userData")
    ? path.join(app.getPath("userData"), "mcp-credentials")
    : "";
  const credentialsPath = settings?.googleOAuthCredentialsPath ||
    path.join(credentialsDir, "google-oauth-credentials.json");

  return {
    command: "npx",
    args: ["-y", "@cocal/google-calendar-mcp"],
    env: {
      GOOGLE_OAUTH_CREDENTIALS: credentialsPath,
    },
  };
}

// Google Calendar 서버 사용 가능 여부
export const GOOGLE_CALENDAR_AVAILABLE = true;

// OAuth 인증이 완료되었는지 확인
export function isGoogleCalendarConfigured(settings?: MCPServerSettings): boolean {
  return !!settings?.googleOAuthAuthenticated;
}

// Google Calendar 서버가 지원하는 도구들
export const GOOGLE_CALENDAR_TOOLS = [
  {
    name: "list_calendars",
    description: "List all calendars",
  },
  {
    name: "list_events",
    description: "List events from a calendar",
  },
  {
    name: "get_event",
    description: "Get a specific event by ID",
  },
  {
    name: "create_event",
    description: "Create a new calendar event",
  },
  {
    name: "update_event",
    description: "Update an existing event",
  },
  {
    name: "delete_event",
    description: "Delete a calendar event",
  },
  {
    name: "search_events",
    description: "Search for events by keyword",
  },
];
