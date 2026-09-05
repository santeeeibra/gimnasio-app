import { NextResponse } from "next/server";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

let cachedGitCommit: string | null = null;

function getCommit(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 7);
  }
  if (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA) {
    return process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.substring(0, 7);
  }
  if (cachedGitCommit) return cachedGitCommit;
  try {
    cachedGitCommit = execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
      timeout: 1500,
    }).trim();
    return cachedGitCommit;
  } catch {
    return process.env.NODE_ENV === "production" ? "prod-build" : "dev";
  }
}

export async function GET() {
  return NextResponse.json(
    {
      commit: getCommit(),
      time: Date.now(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    },
  );
}
