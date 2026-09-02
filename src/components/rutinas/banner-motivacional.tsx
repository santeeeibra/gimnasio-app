import { obtenerFraseDelDia } from "@/lib/frases-motivadoras";

export function BannerMotivacional() {
  const frase = obtenerFraseDelDia();

  return (
    <div className="rounded-[6px] border border-rule bg-paper-2 px-4 py-3">
      <p className="text-sm text-ink-soft italic text-center">
        {frase}
      </p>
    </div>
  );
}
