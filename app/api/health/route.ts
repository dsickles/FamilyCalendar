import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/config";

export function GET() {
  return NextResponse.json({
    status: "ok",
    mode: isDemoMode() ? "demo" : "live",
    timestamp: new Date().toISOString(),
  });
}
