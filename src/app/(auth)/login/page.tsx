"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useLanguage } from "../../../context/LanguageContext";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, t } = useLanguage();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Check if there is an error code in the URL from NextAuth redirection
  const urlError = searchParams.get("error");
  const getErrorMessage = () => {
    if (error) return error;
    if (urlError === "CredentialsSignin") {
      return language === "en" 
        ? "Invalid email or password. Please try again."
        : "Email hoặc mật khẩu không chính xác. Vui lòng thử lại.";
    }
    if (urlError) {
      return language === "en"
        ? "An authentication error occurred. Please try again."
        : "Đã xảy ra lỗi xác thực. Vui lòng đăng nhập lại.";
    }
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(
        language === "en" 
          ? "Please fill in all fields" 
          : "Vui lòng điền đầy đủ các thông tin"
      );
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError(res.error.replace("Error: ", ""));
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-300">
      {/* Decorative Glow */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Card */}
      <div className="w-full max-w-md bg-glass-bg border border-glass-border rounded-3xl p-8 shadow-2xl backdrop-blur-lg relative z-10 transition-all duration-300">
        
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-2xl font-bold text-primary mb-4 tracking-wider">
            🎵 StemVerse
          </Link>
          <h2 className="text-3xl font-extrabold text-text-primary mb-2">
            {t("auth.login.title")}
          </h2>
          <p className="text-sm text-text-secondary">
            {t("auth.login.subtitle")}
          </p>
        </div>

        {/* Error Alert Box */}
        {getErrorMessage() && (
          <div className="mb-6 p-4 rounded-xl bg-error-bg/15 border border-error/20 text-error text-sm font-semibold flex items-center gap-3">
            <span>⚠️</span>
            <p className="flex-1">{getErrorMessage()}</p>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Email
            </label>
            <input
              type="email"
              required
              placeholder={t("auth.login.email_placeholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-glass-border bg-background/50 focus:outline-none focus:border-primary/50 text-text-primary text-sm transition-all duration-200 placeholder-text-muted"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-text-secondary">
                {language === "en" ? "Password" : "Mật khẩu"}
              </label>
              <a href="#" className="text-xs text-primary hover:underline font-semibold">
                {t("auth.login.forgot_password")}
              </a>
            </div>
            <input
              type="password"
              required
              placeholder={t("auth.login.password_placeholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-glass-border bg-background/50 focus:outline-none focus:border-primary/50 text-text-primary text-sm transition-all duration-200 placeholder-text-muted"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-hover text-white dark:text-background font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all duration-200 text-sm mt-2"
          >
            {loading ? t("common.loading") : t("auth.login.submit_btn")}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-glass-border" />
          </div>
          <span className="relative bg-surface px-3 text-xs text-text-muted font-medium uppercase tracking-wider">
            {t("auth.login.oauth_divider")}
          </span>
        </div>

        {/* Google OAuth Button */}
        <button
          onClick={() => {
            document.cookie = "oauth_role=consumer; path=/; max-age=300; SameSite=Lax";
            signIn("google", { callbackUrl: "/" });
          }}
          className="w-full border border-glass-border bg-background/50 hover:bg-glass-border/30 text-text-primary font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-3 transition-all duration-200 text-sm hover:scale-[1.01] active:scale-[0.99]"
        >
          {/* Google SVG Icon */}
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5.04c1.67 0 3.2.58 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.35 1 3.37 3.68 1.42 7.6l3.86 3C6.2 7.74 8.87 5.04 12 5.04z"
            />
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.51h6.43c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.38-4.88 3.38-8.56z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.6c-.23-.69-.36-1.43-.36-2.2s.13-1.51.36-2.2l-3.86-3C.68 8.88 0 10.36 0 12s.68 3.12 1.42 4.8l3.86-3z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.66-2.84c-1.01.68-2.31 1.08-4.3 1.08-3.13 0-5.8-2.7-6.72-5.56l-3.86 3C3.37 20.32 7.35 23 12 23z"
            />
          </svg>
          <span>Google</span>
        </button>

        {/* Signup Link */}
        <p className="mt-8 text-center text-sm text-text-secondary">
          <Link href="/register" className="font-semibold text-primary hover:underline">
            {t("auth.login.signup_link")}
          </Link>
        </p>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background text-text-primary">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
