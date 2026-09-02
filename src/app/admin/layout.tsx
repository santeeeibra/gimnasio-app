import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";

// Panel del ADMIN de la plataforma. Separado de /panel (que es por-gimnasio).
// Usa los tokens de tema por defecto (:root en globals.css), sin tema de gym.

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperadmin();

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-3xl items-baseline justify-between px-6 py-4">
          <span className="text-xs uppercase tracking-[0.18em] text-ink-soft">
            Admin plataforma
          </span>
          <Link
            href="/panel"
            className="text-sm underline decoration-rule underline-offset-2 hover:decoration-ink"
          >
            Volver
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl p-6 md:p-10">{children}</main>
    </div>
  );
}
