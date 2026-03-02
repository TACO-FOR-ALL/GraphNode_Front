import {
  BuiltinServerType,
  MCPServerConfig,
  MCPServerSettings,
} from "../types";
import { getFilesystemConfig } from "./filesystem";
import { getNotionConfig, NOTION_AVAILABLE } from "./notion";
import {
  getGoogleCalendarConfig,
  GOOGLE_CALENDAR_AVAILABLE,
} from "./googleCalendar";

export interface BuiltinServerInfo {
  type: BuiltinServerType;
  name: string;
  description: string;
  icon: string;
  requiresAuth: boolean;
  authProvider?: "google" | "notion";
  available: boolean;
  unavailableReason?: string;
}

// Built-in 서버 메타데이터
export const BUILTIN_SERVERS: BuiltinServerInfo[] = [
  {
    type: "filesystem",
    name: "Filesystem",
    description: "Access local files and directories",
    icon: "folder",
    requiresAuth: false,
    available: true,
  },
  {
    type: "notion",
    name: "Notion",
    description: "Access Notion pages and databases",
    icon: "notion",
    requiresAuth: true,
    authProvider: "notion",
    available: NOTION_AVAILABLE,
  },
  {
    type: "google-calendar",
    name: "Google Calendar",
    description: "Access Google Calendar events",
    icon: "calendar",
    requiresAuth: true,
    authProvider: "google",
    available: GOOGLE_CALENDAR_AVAILABLE,
  },
];

// Built-in 서버 타입에 따른 설정 가져오기
export function getBuiltinServerConfig(
  type: BuiltinServerType,
  settings?: MCPServerSettings,
): Partial<MCPServerConfig> {
  switch (type) {
    case "filesystem":
      return getFilesystemConfig(settings);
    case "notion":
      return getNotionConfig(settings);
    case "google-calendar":
      return getGoogleCalendarConfig(settings);
    default:
      throw new Error(`Unknown builtin server type: ${type}`);
  }
}

// Built-in 서버 정보 가져오기
export function getBuiltinServerInfo(
  type: BuiltinServerType,
): BuiltinServerInfo | undefined {
  return BUILTIN_SERVERS.find((s) => s.type === type);
}
