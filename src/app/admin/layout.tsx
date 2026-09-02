import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";

// Consola de soporte de la plataforma. Separada de /panel (por-gimnasio) y de
// /mi (cliente). Nunca se enlaza desde el flujo normal de ningún gimnasio.
// Doble gate: flag de entorno ADMIN_CONSOLE + requireSuperadmin() (que hace
// notFound(), no redirect). Sin el flag y sin ser el superadmin => 404 seco.
// Usa los tokens de tema por defecto (:root en globals.css), sin tema de gym.

const NAV = [
  { href: "/admin", label: "Monitor" },
  { href: "/admin/gimnasios", label: "Gimnasios" },
  { href: "/admin/push-prueba", label: "Push de prueba" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.ADMIN_CONSOLE !== "1") notFound();
  await requireSuperadmin();

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <nav className="flex items-center gap-4">
            <span className="text-xs uppercase tracking-[0.18em] text-ink-soft">
              Soporte
            </span>
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="text-sm underline decoration-rule underline-offset-2 hover:decoration-ink"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/panel"
            className="text-sm underline decoration-rule underline-offset-2 hover:decoration-ink"
          >
            Salir
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl p-6 md:p-10">{children}</main>
    </div>
  );
}
