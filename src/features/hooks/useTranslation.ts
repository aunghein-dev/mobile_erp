import { useLocale } from "@/shared/contexts/LocaleContext";

export function useTranslation() {
  const { t, locale, setLocale } = useLocale();
  return {
    t,
    locale,
    setLocale,
    loading: false,
  };
}
