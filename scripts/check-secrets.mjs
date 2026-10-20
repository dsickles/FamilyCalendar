#!/usr/bin/env node
// Bundle and secret gate (constitution Principle II).
//
// Run after `next build` with the same env the build used. Fails when the
// PIN, a feed URL, weather coordinates set in env, or the `icsUrl` field
// name reach .next/static, when .env.local is not gitignored or is tracked,
// or when .env.example carries a PIN or feed URL value.

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const staticDir = path.join(root, ".next", "static");
const failures = [];

function needles() {
  const list = [{ label: "field name icsUrl", value: "icsUrl" }];
  const pin = process.env.DASHBOARD_PIN?.trim();
  if (pin) {
    list.push({ label: "DASHBOARD_PIN", value: pin });
  } else {
    failures.push("DASHBOARD_PIN is not set, so the PIN leak check cannot run.");
  }
  for (const [key, raw] of Object.entries(process.env)) {
    const value = raw?.trim();
    if (!value) {
      continue;
    }
    if (/^CAL_[A-Z0-9]+_URL$/.test(key) || key === "WEATHER_LAT" || key === "WEATHER_LON") {
      list.push({ label: key, value });
    }
  }
  return list;
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

function scanBundle() {
  if (!existsSync(staticDir)) {
    failures.push(".next/static is missing. Run `next build` first.");
    return;
  }
  const list = needles();
  let files = 0;
  for (const file of walk(staticDir)) {
    files += 1;
    const text = readFileSync(file, "latin1");
    for (const needle of list) {
      if (text.includes(needle.value)) {
        failures.push(`${needle.label} found in ${path.relative(root, file)}`);
      }
    }
  }
  console.log(`Scanned ${files} files in .next/static for ${list.length} values.`);
}

function git(args) {
  try {
    return { ok: true, out: execFileSync("git", args, { cwd: root, encoding: "utf8" }) };
  } catch (error) {
    return { ok: false, out: String(error.stdout ?? "") };
  }
}

function checkGitignore() {
  if (!git(["check-ignore", "-q", ".env.local"]).ok) {
    failures.push(".env.local is not gitignored.");
  }
  const tracked = git(["ls-files", "--", ".env.local", ".env*.local"]).out.trim();
  if (tracked) {
    failures.push(`Env files are tracked by git: ${tracked.replace(/\n/g, ", ")}`);
  }
}

function checkEnvExample() {
  const file = path.join(root, ".env.example");
  if (!existsSync(file)) {
    failures.push(".env.example is missing.");
    return;
  }
  for (const [index, line] of readFileSync(file, "utf8").split("\n").entries()) {
    const match = /^\s*(DASHBOARD_PIN|CAL_[A-Z0-9]+_URL)\s*=(.*)$/.exec(line);
    if (!match) {
      continue;
    }
    const value = match[2].replace(/\s+#.*$/, "").trim().replace(/^["']|["']$/g, "");
    if (value) {
      failures.push(`.env.example:${index + 1} sets ${match[1]}; leave it empty.`);
    }
  }
}

scanBundle();
checkGitignore();
checkEnvExample();

if (failures.length > 0) {
  console.error("Secret gate failed:");
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}
console.log("Secret gate passed.");
