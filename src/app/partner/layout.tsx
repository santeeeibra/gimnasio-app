import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import { requirePartner } from "@/lib/partners/auth";

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  await requirePartner();
  const profile = await getSessionProfile();
  const puedeVolverAlPanel =
    profile?.activo !== false &&
    (profile?.rol === "dueno" || profile?.rol === "staff" || profile?.rol === "entrenador");

  return (
    <div className="min-h-screen bg-[#0c0d11]">
      {puedeVolverAlPanel && (
        <div className="border-b border-white/10 bg-zinc-950 px-4 py-2 text-right">
          <Link href="/panel" className="text-xs font-semibold text-emerald-400 hover:underline">
            Ir al panel del gimnasio
          </Link>
        </div>
      )}
      {children}
    </div>
  );
}
