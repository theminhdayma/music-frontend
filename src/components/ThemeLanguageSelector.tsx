"use client";

import React from "react";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";

export const ThemeLanguageSelector: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-glass-border bg-glass-bg p-2 shadow-lg backdrop-blur-md">
      {/* Language Toggle Button */}
      <button
        onClick={() => setLanguage(language === "en" ? "vi" : "en")}
        className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all hover:bg-primary/20 hover:scale-105"
        style={{ color: "var(--foreground)" }}
        title={language === "en" ? "Chuyển sang Tiếng Việt" : "Switch to English"}
      >
        {language === "en" ? "EN" : "VI"}
      </button>

      {/* Divider */}
      <div className="h-4 w-[1px]" style={{ backgroundColor: "var(--surface-border)" }} />

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:bg-primary/20 hover:scale-105 text-text-primary"
        title={theme === "dark" ? "Chuyển sang Giao diện Sáng" : "Switch to Dark Theme"}
      >
        {theme === "dark" ? (
          <svg className="w-4 h-4 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        )}
      </button>
    </div>
  );
};
