import messages from "./messages/en.json";
import { defaultLocale, isLocale, type Locale } from "./config";

export type Messages = typeof messages;

const dictionaries: Record<Locale, Messages> = {
  en: messages,
};

export function getLocale(value: string | undefined): Locale {
  return isLocale(value) ? value : defaultLocale;
}

export function getMessages(locale: Locale = defaultLocale): Messages {
  return dictionaries[locale];
}