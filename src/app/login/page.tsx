import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { g?: string };
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <LoginForm paramG={searchParams.g ?? null} />
    </Suspense>
  );
}
