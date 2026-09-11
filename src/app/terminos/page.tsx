import Link from "next/link";

export const metadata = {
  title: "Términos y Condiciones — SysGym",
};

export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] font-sans p-6">
      <div className="max-w-2xl mx-auto py-10 space-y-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight">Términos y Condiciones</h1>
          <Link href="/" className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors">
            ← Volver
          </Link>
        </div>
        <p className="text-xs text-neutral-500">Última actualización: septiembre de 2026</p>

        <div className="space-y-6 text-sm leading-relaxed text-neutral-300">
          <section>
            <h2 className="text-base font-bold text-white mb-2">1. Aceptación</h2>
            <p>
              Al crear una cuenta en SysGym (como dueño de gimnasio o como atleta) aceptás estos
              Términos y Condiciones y nuestra política de tratamiento de datos personales. Si no
              estás de acuerdo, no debés utilizar la plataforma.
            </p>
          </section>
          <section>
            <h2 className="text-base font-bold text-white mb-2">2. El servicio</h2>
            <p>
              SysGym es un software de gestión (SaaS) para gimnasios: administración de socios,
              rutinas, cobros y comunicación. No somos una entidad financiera ni un estudio contable;
              los cobros se procesan a través de proveedores externos (ej. Mercado Pago) y, cuando el
              dueño lo habilita, la facturación electrónica se emite ante AFIP bajo su propio CUIT y
              responsabilidad fiscal.
            </p>
          </section>
          <section>
            <h2 className="text-base font-bold text-white mb-2">3. Cuenta y responsabilidad del dueño</h2>
            <p>
              El dueño del gimnasio es responsable de la veracidad de los datos que carga (socios,
              precios, datos fiscales) y del cumplimiento de sus obligaciones legales, impositivas y
              laborales frente a sus socios y organismos públicos. SysGym provee la herramienta, no
              asesoramiento legal, contable ni impositivo.
            </p>
          </section>
          <section>
            <h2 className="text-base font-bold text-white mb-2">4. Datos personales</h2>
            <p>
              Los datos cargados (DNI, contacto, peso, rutinas, pagos) se usan exclusivamente para
              prestar el servicio dentro del gimnasio correspondiente y no se comparten con terceros
              salvo obligación legal o para procesar pagos/facturación con los proveedores mencionados
              arriba. Cada usuario puede solicitar la baja o corrección de sus datos contactando al
              gimnasio o a soporte de SysGym.
            </p>
          </section>
          <section>
            <h2 className="text-base font-bold text-white mb-2">5. Planes y facturación de la plataforma</h2>
            <p>
              El acceso a SysGym se rige por el plan contratado (prueba, Free/Pro/Elite u otro vigente).
              La suspensión por falta de pago del plan de plataforma no exime al dueño de sus
              obligaciones con sus propios socios.
            </p>
          </section>
          <section>
            <h2 className="text-base font-bold text-white mb-2">6. Disponibilidad y límites</h2>
            <p>
              Hacemos el mejor esfuerzo para mantener el servicio disponible, pero no garantizamos
              disponibilidad ininterrumpida. No somos responsables por pérdidas derivadas de
              interrupciones del servicio, fallas de terceros (proveedores de pago, AFIP, hosting) o
              uso indebido de la plataforma.
            </p>
          </section>
          <section>
            <h2 className="text-base font-bold text-white mb-2">7. Cambios</h2>
            <p>
              Podemos actualizar estos términos. Los cambios relevantes se comunicarán dentro de la
              app. El uso continuado de SysGym después de un cambio implica su aceptación.
            </p>
          </section>
          <section>
            <h2 className="text-base font-bold text-white mb-2">8. Contacto</h2>
            <p>Consultas sobre estos términos: contactanos desde Ajustes → Contactar soporte, dentro de la app.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
