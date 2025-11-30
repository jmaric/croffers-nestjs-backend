/**
 * Helper function to get translated content from a multilingual object
 * @param item - The object containing translations
 * @param lang - Preferred language code (e.g., 'en', 'hr', 'de', 'it')
 * @param fallbackLang - Fallback language if preferred is not available (default: 'en')
 * @returns Object with translated fields
 */
export function getTranslatedContent<T extends Record<string, any>>(
  item: T,
  lang: string = 'en',
  fallbackLang: string = 'en',
): T {
  if (!item || typeof item !== 'object') {
    return item;
  }

  const result: any = { ...item };
  const translations = item.translations as Record<
    string,
    Record<string, any>
  > | null;

  if (!translations || typeof translations !== 'object') {
    return result;
  }

  // Get the translations for the requested language or fallback
  const langTranslations = translations[lang] || translations[fallbackLang];

  if (langTranslations && typeof langTranslations === 'object') {
    // Override base fields with translated versions
    Object.keys(langTranslations).forEach((key) => {
      if (langTranslations[key] !== undefined && langTranslations[key] !== null) {
        result[key] = langTranslations[key];
      }
    });
  }

  // Remove the translations object from the result to keep response clean
  delete result.translations;

  return result as T;
}

/**
 * Helper function to translate an array of items
 * @param items - Array of objects containing translations
 * @param lang - Preferred language code
 * @param fallbackLang - Fallback language
 * @returns Array with translated objects
 */
export function getTranslatedArray<T extends Record<string, any>>(
  items: T[],
  lang: string = 'en',
  fallbackLang: string = 'en',
): T[] {
  if (!Array.isArray(items)) {
    return items;
  }

  return items.map((item) => getTranslatedContent(item, lang, fallbackLang));
}

/**
 * Helper to validate translation structure
 * @param translations - The translations object to validate
 * @param supportedLanguages - Array of supported language codes
 * @returns Boolean indicating if valid
 */
export function isValidTranslations(
  translations: any,
  supportedLanguages: string[] = ['en', 'hr', 'de', 'it'],
): boolean {
  if (!translations || typeof translations !== 'object') {
    return false;
  }

  // Check if at least one supported language has translations
  return supportedLanguages.some(
    (lang) =>
      translations[lang] &&
      typeof translations[lang] === 'object' &&
      Object.keys(translations[lang]).length > 0,
  );
}
