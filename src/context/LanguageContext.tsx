"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import en from "../i18n/en.json";
import vi from "../i18n/vi.json";

type Language = "en" | "vi";

type Dictionary = typeof en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const dictionaries: Record<Language, Dictionary> = { en, vi };

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Detect browser language or stored setting on client mount
    const storedLang = localStorage.getItem("language") as Language | null;
    if (storedLang && (storedLang === "en" || storedLang === "vi")) {
      setLanguageState(storedLang);
    } else {
      const browserLang = navigator.language.split("-")[0];
      setLanguageState(browserLang === "vi" ? "vi" : "en");
    }
    setMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const t = (path: string): string => {
    const keys = path.split(".");
    let current: unknown = dictionaries[language];

    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = (current as Record<string, unknown>)[key];
      } else {
        return path; // Fallback to path key if translation is missing
      }
    }

    return typeof current === "string" ? current : path;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {/* Prevent flash of untranslated content */}
      <div style={{ visibility: mounted ? "visible" : "hidden" }}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
