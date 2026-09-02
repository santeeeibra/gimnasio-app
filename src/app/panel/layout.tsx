import Link from "next/link";
import { requireDueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions";
import { parseTema, temaToVars } from "@/lib/tema";

const NAV = [
  { href: "/panel", label: "Resumen" },
  { href: "/panel/clientes", label: "Clientes" },
  { href: "/panel/planes", label: "Planes" },
  { href: "/panel/mensajes", label: "Mensajes" },
  { href: "/panel/ajustes", label: "Ajustes" },
];

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireDueno();
  const supabase = await createClient();
  const { data: gym } = await supabase
    .from("gimnasios")
    .select("nombre, tema")
    .eq("id", profile.gimnasio_id)
    .single();

  const temaVars = temaToVars(parseTema(gym?.tema));

  return (
    <div
      className="min-h-screen bg-paper md:grid md:grid-cols-[220px_1fr]"
      style={temaVars}
    >
      <aside className="border-b md:border-b-0 md:border-r border-rule p-5 flex md:flex-col gap-6 md:sticky md:top-0 md:h-screen">
        <div>
          <p className="font-display text-lg leading-tight">{gym?.nombre}</p>
          <p className="text-xs text-ink-soft">{profile.nombre}</p>
        </div>
        <nav className="flex md:flex-col gap-1 flex-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 rounded-[5px] text-sm hover:bg-paper-2"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logout}>
          <button className="text-xs text-ink-soft hover:text-ink underline underline-offset-2">
            Salir
          </button>
        </form>
      </aside>

      <main className="p-6 md:p-10 max-w-5xl w-full">{children}</main>
    </div>
  );
}
