/* 
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
*/
export type OpenAIModel =
  | "gpt-4o-mini"
  | "gpt-4o"
  | "gpt-5-pro"
  | "gpt-5-nano"
  | "gpt-5-mini"
  | "gpt-5";

export const OPENAI_MODEL: OpenAIModel[] = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-5-pro",
  "gpt-5-nano",
  "gpt-5-mini",
  "gpt-5",
];
export const OPENAI_MODEL_DEFAULT = "gpt-4o-mini";
