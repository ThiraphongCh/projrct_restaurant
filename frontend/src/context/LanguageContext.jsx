import { createContext, useContext, useState, useCallback } from 'react';
import { translations } from './translations';

const LanguageContext = createContext();

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('lang') || 'th';
  });

  const changeLanguage = useCallback((next) => {
    setLang(next);
    localStorage.setItem('lang', next);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLang((prev) => {
      const next = prev === 'th' ? 'en' : 'th';
      localStorage.setItem('lang', next);
      return next;
    });
  }, []);

  // Get a UI string by key
  const t = useCallback(
    (key) => {
      const dict = translations[lang] || translations.th;
      return dict[key] ?? translations.en[key] ?? key;
    },
    [lang]
  );

  // Pick a bilingual item's name based on current language
  const getName = useCallback(
    (item) => {
      if (!item) return '';
      if (lang === 'th') return item.nameTh || item.name;
      return item.name || item.nameTh;
    },
    [lang]
  );

  // Pick a bilingual item's description based on current language
  const getDesc = useCallback(
    (item) => {
      if (!item) return '';
      if (lang === 'th') return item.descriptionTh || item.description;
      return item.description || item.descriptionTh;
    },
    [lang]
  );

  const categoryLabel = useCallback(
    (category) => {
      const map = {
        appetizer: t('categoryAppetizer'),
        main: t('categoryMain'),
        dessert: t('categoryDessert'),
        drink: t('categoryDrink'),
        side: t('categorySide'),
      };
      return map[category] || category;
    },
    [t]
  );

  const formatPrice = useCallback(
    (value) => `${Number(value).toLocaleString()} ${t('currency')}`,
    [t]
  );

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang: changeLanguage,
        toggleLanguage,
        t,
        getName,
        getDesc,
        categoryLabel,
        formatPrice,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}