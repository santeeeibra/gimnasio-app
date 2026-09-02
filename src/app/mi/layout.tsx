import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseTema, temaToVars } from "@/lib/tema";

export default async function MiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: gym } = await supabase
    .from("gimnasios")
    .select("tema")
    .eq("id", profile.gimnasio_id)
    .single();

  return (
    <div className="min-h-screen bg-paper" style={temaToVars(parseTema(gym?.tema))}>
      {children}
    </div>
  );
}
