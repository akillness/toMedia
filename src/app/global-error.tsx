"use client";

import { useEffect } from "react";
import { Geist, Geist_Mono } from "next/font/google";

import { LeverMark } from "@/components/LeverMark";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


/**
 * Root-layout-level error boundary. `error.tsx` only catches errors thrown
 * while rendering *inside* the root layout (page/segment content) — if
 * `layout.tsx` itself throws, Next.js falls back all the way to this file
 * instead, which is why it must define its own `<html>`/`<body>` and re-load
 * both `globals.css` and the Geist font variables directly, rather than
 * relying on the (possibly-broken) layout to have rendered them — otherwise
 * the fallback silently reverts to a system sans font. The `viewport` export
 * from `layout.tsx` also can't apply here, so the meta tag is hand-authored
 * below. Same brand voice and never-echo-the-raw-error rule as `error.tsx`:
 * a crash this deep should still look like Lever, not a framework stack
 * trace, and `reset()` is a real recovery path in place of a forced
 * full-page reload.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Lever root layout error:", error);
  }, [error]);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-full flex flex-col">
        <div className="brand-accent-bar w-full" />

        <main className="mx-auto flex min-h-[70vh] w-full max-w-5xl flex-col items-center justify-center px-6 py-10 text-center">
          <LeverMark className="h-10 w-10" />
          <h1
            className="mt-4 text-2xl font-black tracking-tight"
            style={{ color: "var(--brand-ink)" }}
          >
            Something didn&apos;t compute
          </h1>
          <p className="mt-2 max-w-sm text-sm text-slate-600">
            Lever hit an unexpected error before the page could load. Nothing was sent
            or saved — retry, or reload if it keeps happening.
            {error.digest && (
              <>
                {" "}
                <span className="text-slate-400">(ref {error.digest})</span>
              </>
            )}
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
