import { requireSuperadmin } from "@/lib/auth";
import MemojiPoc from "./memoji-poc";

export default async function Page() {
  // POC de rig facial con cámara — acceso restringido a superadmin mientras
  // se prueba viabilidad (usa la cámara del dispositivo).
  await requireSuperadmin();
  return <MemojiPoc />;
}
