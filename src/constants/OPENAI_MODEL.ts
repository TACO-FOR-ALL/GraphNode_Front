export type LLMProvider = "openai" | "claude" | "gemini";

export type OpenAIModel =
  | "gpt-4o-mini"
  | "gpt-4o"
  | "gpt-5-pro"
  | "gpt-5-nano"
  | "gpt-5-mini"
  | "gpt-5"
  | "gpt-5.2-pro"
  | "gpt-5.2";

export type ClaudeModel =
  | "claude-opus-4-6"
  | "claude-sonnet-4-6"
  | "claude-haiku-4-5";

export type GeminiModel = "gemini-2.5-flash" | "gemini-2.5-pro";

export type LLMModel = OpenAIModel | ClaudeModel | GeminiModel;

export const OPENAI_MODELS: OpenAIModel[] = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-5-pro",
  "gpt-5-nano",
  "gpt-5-mini",
  "gpt-5",
  "gpt-5.2",
  "gpt-5.2-pro",
];

export const CLAUDE_MODELS: ClaudeModel[] = [
  "claude-opus-4-6",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
];

export const GEMINI_MODELS: GeminiModel[] = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
];

export const LLM_MODEL_DEFAULT: LLMModel = "gpt-5.2";

export const LLM_MODEL_GROUPS: {
  provider: LLMProvider;
  label: string;
  models: LLMModel[];
}[] = [
  { provider: "openai", label: "ChatGPT", models: OPENAI_MODELS },
  { provider: "claude", label: "Claude", models: CLAUDE_MODELS },
  { provider: "gemini", label: "Gemini", models: GEMINI_MODELS },
];

export function getProvider(model: LLMModel): LLMProvider {
  if (model.startsWith("claude-")) return "claude";
  if (model.startsWith("gemini-")) return "gemini";
  return "openai";
}
