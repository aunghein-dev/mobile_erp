import { I18n } from "i18n-js";
import en from "@/shared/assets/locales/en/common.json";
import my from "@/shared/assets/locales/my/common.json";

export type Locale = "en" | "my";

const i18n = new I18n({
  en,
  my,
});

i18n.enableFallback = true;
i18n.defaultLocale = "en";
i18n.locale = "en";

export function setI18nLocale(locale: Locale) {
  i18n.locale = locale;
}

export function t(key: string, params?: Record<string, unknown>) {
  return i18n.t(key, params) as string;
}
