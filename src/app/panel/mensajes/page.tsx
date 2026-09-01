import { requireDueno } from "@/lib/auth";

export default async function MensajesPage() {
  await requireDueno();
  return (
    <div>
      <h1 className="text-3xl mb-2">Mensajes</h1>
      <p className="text-sm text-ink-soft">
        Próximo entregable: avisos individuales y masivos con push.
      </p>
    </div>
  );
}
