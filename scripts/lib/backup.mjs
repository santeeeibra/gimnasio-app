// Backup de seguridad reutilizable para scripts destructivos (seed/reset).
// Todos estos scripts corren contra la Supabase real (no hay stack local en
// este repo — .env.local apunta al proyecto de producción), así que un
// `.delete()` mal alcanzado borra datos reales sin aviso. Ver incidente
// 2026-09-14 en MEMORIA.md.
//
// Uso:
//   import { backupAntesDeBorrar } from "./lib/backup.mjs";
//   await backupAntesDeBorrar("seed-gym-demo", {
//     pagos: db.from("pagos").select("*").eq("gimnasio_id", gym.id),
//     registros_entrada: db.from("registros_entrada").select("*").eq("gimnasio_id", gym.id),
//   });
//   // recién ahora los .delete()
import { mkdirSync, writeFileSync } from "node:fs";

export async function backupAntesDeBorrar(etiqueta, consultas) {
  console.log(`🛟 Backup de seguridad antes de borrar (${etiqueta})...`);
  const entradas = Object.entries(consultas);
  const resultados = await Promise.all(entradas.map(([, q]) => q));

  const backup = { etiqueta, fecha: new Date().toISOString() };
  entradas.forEach(([nombre], i) => {
    const { data, error } = resultados[i];
    if (error) {
      console.warn(`   ⚠️ No se pudo respaldar "${nombre}": ${error.message}`);
    }
    backup[nombre] = data ?? [];
  });

  mkdirSync("backups", { recursive: true });
  const archivo = `backups/${etiqueta}-${backup.fecha.replace(/[:.]/g, "-")}.json`;
  writeFileSync(archivo, JSON.stringify(backup, null, 2), "utf8");

  const resumen = entradas
    .map(([nombre]) => `${backup[nombre].length} ${nombre}`)
    .join(", ");
  console.log(`   ✅ Backup guardado en ${archivo} (${resumen}).`);
  console.log(
    "   Si necesitás recuperar algo, es JSON plano: reinsertalo a mano con execute_sql o el dashboard de Supabase.\n",
  );
  return archivo;
}
