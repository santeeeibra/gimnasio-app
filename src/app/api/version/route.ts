import { NextResponse } from "next/server";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

function getCommit(): string {
  // 1. Vercel Deployment ID (Único por cada deploy de producción o preview)
  if (process.env.VERCEL_DEPLOYMENT_ID) {
    return process.env.VERCEL_DEPLOYMENT_ID;
  }
  // 2. Vercel Git Commit SHA (Hash del commit de Git)
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 7);
  }
  if (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA) {
    return process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.substring(0, 7);
  }
  // 3. Fallback Git local (Desarrollo local)
  try {
    return execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
      timeout: 1500,
    }).trim();
  } catch {
    return process.env.NODE_ENV === "production" ? "prod-dynamic" : "dev";
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
