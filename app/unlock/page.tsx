"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Delete, Lock } from "lucide-react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "go"] as const;

type UnlockBody = {
  error?: string;
  code?: string;
  remaining?: number;
  resetAt?: number;
  retryAfterSeconds?: number;
  allowed?: boolean;
};

function isRateLimited(status: number, body: UnlockBody): boolean {
  return (
    status === 429 || body.code === "rate_limited" || body.allowed === false
  );
}

function lockoutUntil(body: UnlockBody): number {
  return (
    body.resetAt ?? Date.now() + (body.retryAfterSeconds ?? 15 * 60) * 1000
  );
}

export default function UnlockPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState("Enter PIN to continue");
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const locked = lockedUntil !== null && now < lockedUntil;
  const padDisabled = locked || pending || checking;

  useEffect(() => {
    if (!lockedUntil) {
      return;
    }
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [lockedUntil]);

  useEffect(() => {
    if (lockedUntil && now >= lockedUntil) {
      setLockedUntil(null);
      setMessage("Enter PIN to continue");
    }
  }, [lockedUntil, now]);

  useEffect(() => {
    let cancelled = false;

    async function recheckLockout() {
      try {
        const response = await fetch("/api/auth/unlock", {
          method: "GET",
          cache: "no-store",
        });
        const body = (await response.json().catch(() => ({}))) as UnlockBody;
        if (cancelled) {
          return;
        }
        if (isRateLimited(response.status, body)) {
          setLockedUntil(lockoutUntil(body));
          setPin("");
          setMessage("Too many attempts. Try again in 15 minutes.");
        }
      } catch {
        // Server still enforces lockout on submit if the probe fails.
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    }

    void recheckLockout();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(nextPin = pin) {
    if (padDisabled || nextPin.length < 4) {
      return;
    }
    setPending(true);
    setError(false);
    try {
      const response = await fetch("/api/auth/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin: nextPin }),
      });
      const body = (await response.json().catch(() => ({}))) as UnlockBody;
      if (isRateLimited(response.status, body)) {
        setLockedUntil(lockoutUntil(body));
        setPin("");
        setError(true);
        setMessage("Too many attempts. Try again in 15 minutes.");
        return;
      }
      if (!response.ok) {
        setError(true);
        setPin("");
        const left = body.remaining;
        setMessage(
          typeof left === "number"
            ? `Wrong PIN. ${left} attempt${left === 1 ? "" : "s"} left.`
            : "Wrong PIN. Try again.",
        );
        return;
      }
      window.location.assign("/");
    } catch {
      setError(true);
      setPin("");
      setMessage("Could not reach the dashboard. Try again.");
    } finally {
      setPending(false);
    }
  }

  function press(key: (typeof KEYS)[number]) {
    if (padDisabled) {
      return;
    }
    if (key === "back") {
      setPin((current) => current.slice(0, -1));
      return;
    }
    if (key === "go") {
      void submit();
      return;
    }
    setPin((current) => {
      if (current.length >= 8) {
        return current;
      }
      return `${current}${key}`;
    });
  }

  const waitLabel =
    locked && lockedUntil
      ? `Too many attempts. Try again in ${Math.max(1, Math.ceil((lockedUntil - now) / 60000))} min.`
      : message;

  return (
    <main className="flex h-dvh w-full items-center justify-center bg-[#0a0a0f]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-8 px-6"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
            <Lock className="h-7 w-7 text-white/70" aria-hidden />
          </div>
          <h1 className="text-2xl font-medium tracking-tight text-white/90">
            Family Wall Dashboard
          </h1>
          <p className="min-h-5 text-center text-sm text-white/45" aria-live="polite">
            {waitLabel}
          </p>
        </div>

        <motion.div
          animate={error ? { x: [-8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex gap-3"
          aria-label="PIN length"
        >
          {Array.from({ length: Math.max(4, pin.length) }).map((_, index) => (
            <span
              key={index}
              className={`h-3 w-3 rounded-full ${
                index < pin.length ? "bg-white/90" : "bg-white/20"
              }`}
            />
          ))}
        </motion.div>

        <div className="grid grid-cols-3 gap-4">
          {KEYS.map((key) => {
            const label =
              key === "back" ? "Backspace" : key === "go" ? "Submit" : key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => press(key)}
                aria-label={label}
                disabled={padDisabled}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5 text-xl text-white/90 ring-1 ring-white/10 transition active:scale-95 disabled:opacity-30"
              >
                {key === "back" ? (
                  <Delete className="h-6 w-6" />
                ) : key === "go" ? (
                  "OK"
                ) : (
                  key
                )}
              </button>
            );
          })}
        </div>
      </motion.div>
    </main>
  );
}
