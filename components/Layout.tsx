import Link from "next/link";
import { ReactNode } from "react";
import { useTheme } from "./ThemeProvider";

export default function Layout({ children }: { children: ReactNode }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark transition-colors duration-200">
      {/* ── Top navbar ────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark transition-colors">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold text-ink dark:text-white"
          >
            <span className="">TravelThreads</span>
          </Link>

          {/* Search bar - wider and more integrated */}
          <div className="flex-1 max-w-xl mx-8 hidden md:block">
            <div className="relative">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-dark"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="Search posts (city, wifi, price...)"
                className="w-full rounded-2xl border-none bg-hover-light dark:bg-hover-dark pl-11 pr-4 py-2.5 text-sm text-ink dark:text-gray-200 placeholder:text-muted-dark focus:ring-1 focus:ring-accent-blue/50 outline-none transition-all"
              />
            </div>
          </div>

          {/* Navigation with icons and labels */}
          <nav className="flex items-center gap-6">
            <Link href="/" className="flex flex-col items-center gap-1 group">
              <div className="p-1 rounded-lg group-hover:bg-hover-dark transition-colors text-muted-dark group-hover:text-white">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <span className="text-[10px] font-medium text-muted-dark group-hover:text-white transition-colors">Home</span>
            </Link>

            <Link href="/communities" className="flex flex-col items-center gap-1 group">
              <div className="p-1 rounded-lg group-hover:bg-hover-dark transition-colors text-muted-dark group-hover:text-white">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m16-10a4 4 0 11-8 0 4 4 0 018 0zM9 7a4 4 0 11-8 0 4 4 0 018 0zm10 14v-2a4 4 0 00-3-3.87M21 12a4 4 0 010 7.75" />
                </svg>
              </div>
              <span className="text-[10px] font-medium text-muted-dark group-hover:text-white transition-colors">Communities</span>
            </Link>

            <Link href="/messages" className="flex flex-col items-center gap-1 group">
              <div className="p-1 rounded-lg group-hover:bg-hover-dark transition-colors text-muted-dark group-hover:text-white">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <span className="text-[10px] font-medium text-muted-dark group-hover:text-white transition-colors">Messages</span>
            </Link>

            <Link href="/likes" className="flex flex-col items-center gap-1 group">
              <div className="p-1 rounded-lg group-hover:bg-hover-dark transition-colors text-muted-dark group-hover:text-white">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <span className="text-[10px] font-medium text-muted-dark group-hover:text-white transition-colors">Likes</span>
            </Link>

            <Link href="/profile" className="flex flex-col items-center gap-1 group">
              <div className="p-1 rounded-lg group-hover:bg-hover-dark transition-colors text-muted-dark group-hover:text-white">
                <div className="w-6 h-6 rounded-full bg-border-dark flex items-center justify-center overflow-hidden border border-transparent group-hover:border-muted-dark">
                  <svg width="18" height="18" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <span className="text-[10px] font-medium text-muted-dark group-hover:text-white transition-colors">Profile</span>
            </Link>

            {/* Dark/Light toggle - shifted to the end */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-hover-light dark:bg-hover-dark text-muted-dark hover:text-white transition-all ml-2"
            >
              {theme === "dark" ? (
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
                </svg>
              ) : (
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* ── Main content ─────────────────────────── */}
      <main className="mx-auto max-w-3xl px-4 py-4">{children}</main>
    </div>
  );
}
