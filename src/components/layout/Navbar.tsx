"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  const navLinks = [
    { href: "/songs", label: t("nav.explore") },
    { href: "/studio", label: t("nav.studio") },
    { href: "/wallet", label: t("nav.wallet") },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-glass-border bg-glass-bg/85 shadow-sm backdrop-blur-md transition-all duration-300">
      <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-3 text-2xl font-extrabold tracking-wider text-primary">
            <div className="hover:scale-110 transition-transform duration-200 flex items-center justify-center text-primary">
              <svg className="w-7 h-7 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" fill="currentColor" />
                <circle cx="18" cy="16" r="3" fill="currentColor" />
              </svg>
            </div>
            <span className="bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">StemVerse</span>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:!flex space-x-8 text-sm font-medium">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`transition-colors duration-200 hover:text-primary ${
                isActive(link.href) ? "text-primary font-semibold" : "text-text-secondary"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Action Controls & User Auth */}
        <div className="hidden md:!flex items-center space-x-4">
          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === "en" ? "vi" : "en")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all hover:bg-glass-border hover:scale-105 border border-glass-border"
            style={{ color: "var(--foreground)" }}
            title={language === "en" ? "Chuyển sang Tiếng Việt" : "Switch to English"}
          >
            {language === "en" ? "EN" : "VI"}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:bg-glass-border hover:scale-105 border border-glass-border text-text-primary"
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

          {/* Divider */}
          <div className="h-6 w-[1px] bg-glass-border" />

          {/* Auth Section */}
          {session ? (
            <div className="relative">
              {/* User Dropdown Button */}
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center space-x-2 rounded-full border border-glass-border p-1 pr-3 hover:bg-glass-border/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-primary-hover text-white dark:text-background font-extrabold text-sm shadow-sm">
                  {session.user?.name ? session.user.name[0].toUpperCase() : "U"}
                </div>
                <span className="max-w-[120px] truncate text-sm font-semibold text-text-primary">
                  {session.user?.name}
                </span>
                <svg className="w-3 h-3 text-text-muted stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {userDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-glass-border bg-surface p-2 shadow-xl backdrop-blur-md z-20">
                    <div className="px-3 py-2 border-b border-glass-border mb-1">
                      <p className="text-xs font-bold text-primary uppercase">
                        {(session.user as { role?: string }).role || "User"}
                      </p>
                    </div>
                    <Link
                      href="/upload"
                      onClick={() => setUserDropdownOpen(false)}
                      className="block px-3 py-2 text-sm text-text-secondary hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                    >
                      {t("nav.upload")}
                    </Link>
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        signOut();
                      }}
                      className="w-full text-left block px-3 py-2 text-sm text-error hover:bg-error-bg/10 rounded-lg transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                href="/login"
                className="text-sm font-semibold text-text-secondary hover:text-primary transition-colors"
              >
                {t("auth.login.submit_btn")}
              </Link>
              <Link
                href="/register"
                className="bg-primary hover:bg-primary-hover text-white dark:text-background px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                {t("auth.signup.submit_btn").split(" ").slice(-2).join(" ") || "Sign Up"}
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center md:hidden space-x-2">
          {/* Mobile Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-glass-border bg-glass-bg text-text-primary"
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

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-text-secondary hover:bg-glass-border/40 focus:outline-none"
          >
            <span className="sr-only">Open Menu</span>
            {mobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="border-t border-glass-border bg-glass-bg backdrop-blur-lg md:hidden transition-all duration-300">
          <div className="space-y-1 px-4 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-xl text-base font-medium transition-colors ${
                  isActive(link.href)
                    ? "bg-primary/10 text-primary"
                    : "text-text-secondary hover:bg-glass-border/40 hover:text-text-primary"
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className="my-4 h-[1px] bg-glass-border" />

            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-text-secondary">{t("common.language")}</span>
              <button
                onClick={() => setLanguage(language === "en" ? "vi" : "en")}
                className="rounded-lg border border-glass-border px-3 py-1 text-xs font-bold"
              >
                {language === "en" ? "Tiếng Việt" : "English"}
              </button>
            </div>

            <div className="mt-4 space-y-2 px-3">
              {session ? (
                <>
                  <div className="flex items-center space-x-3 py-2 border-b border-glass-border mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary font-bold">
                      {session.user?.name ? session.user.name[0].toUpperCase() : "U"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{session.user?.name}</p>
                      <p className="text-xs text-text-muted uppercase">{(session.user as { role?: string }).role || "User"}</p>
                    </div>
                  </div>
                  <Link
                    href="/upload"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center bg-primary text-white py-2.5 rounded-xl text-sm font-bold shadow-md shadow-primary/20"
                  >
                    {t("nav.upload")}
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut();
                    }}
                    className="block w-full border border-glass-border text-error py-2.5 rounded-xl text-sm font-semibold"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex h-11 items-center justify-center rounded-xl border border-glass-border text-sm font-semibold text-text-primary"
                  >
                    {t("auth.login.submit_btn")}
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex h-11 items-center justify-center rounded-xl bg-primary text-white dark:text-background text-sm font-bold shadow-md shadow-primary/20"
                  >
                    {t("auth.signup.submit_btn").split(" ").slice(-2).join(" ") || "Sign Up"}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
