import { DEFAULT_NOTE_EN } from "./en";
import { DEFAULT_NOTE_KO } from "./ko";
import { DEFAULT_NOTE_JA } from "./ja";
import { DEFAULT_NOTE_ZH } from "./zh";

export const DEFAULT_NOTES: Record<string, string> = {
  en: DEFAULT_NOTE_EN,
  ko: DEFAULT_NOTE_KO,
  ja: DEFAULT_NOTE_JA,
  zh: DEFAULT_NOTE_ZH,
};

export function getDefaultNoteContent(language: string): string {
  return DEFAULT_NOTES[language] || DEFAULT_NOTES.en;
}
