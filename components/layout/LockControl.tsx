"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

export default function LockControl() {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  async function lock() {
    if (pending) {
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/auth/lock", { method: "POST" });
      if (response.ok) {
        window.location.assign("/unlock");
        return;
      }
    } finally {
      setPending(false);
      setConfirming(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Lock dashboard"
        onClick={() => setConfirming(true)}
        className="relative z-20 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/25 ring-1 ring-white/10 transition hover:text-white/50"
      >
        <Lock className="h-5 w-5" aria-hidden />
      </button>

      {confirming ? (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lock-title"
        >
          <div className="w-[min(420px,90vw)] rounded-2xl border border-white/10 bg-[#12121a] p-6 shadow-2xl">
            <h2 id="lock-title" className="text-lg font-medium text-white/90">
              Lock dashboard?
            </h2>
            <p className="mt-2 text-sm text-white/55">
              PIN will be required.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-white/12 text-sm font-medium text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void lock()}
                disabled={pending}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-full px-5 text-sm text-white/70 ring-1 ring-white/15"
              >
                Lock
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
