import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { linkClasses } from "@/components/ui";

export const metadata = { title: "Gimnasio suspendido · SysGym" };

export default function SuspendidoPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-paper px-6 text-center text-ink">
      <div className="flex size-14 items-center justify-center rounded-[16px] border border-rule bg-paper-2 text-danger">
        <ShieldAlert className="size-7" aria-hidden />
      </div>
      <h1 className="text-xl font-display font-bold">Gimnasio suspendido</h1>
      <p className="max-w-sm text-sm text-ink-soft leading-relaxed">
        El acceso a este gimnasio está pausado. Si sos el responsable,
        comunicate con soporte para reactivarlo.
      </p>
      <Link href="/login" className={`text-sm ${linkClasses.inline}`}>
        Volver al inicio
      </Link>
    </main>
  );
}
