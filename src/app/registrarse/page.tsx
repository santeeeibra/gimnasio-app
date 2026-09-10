import { registrarCuentaIndependiente } from "./actions";

export default function RegistrarsePage() {
  return (
    <div className="min-h-screen bg-[#0c0d11] text-white flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-[#16171d] p-6 rounded-[20px] shadow-2xl border border-white/5">
        <h1 className="text-2xl font-bold mb-2">Crear Cuenta</h1>
        <p className="text-sm text-gray-400 mb-6">Empezá a gestionar tus rutinas</p>

        <form action={registrarCuentaIndependiente} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block text-gray-300">Nombre</label>
            <input 
              name="nombre" 
              required 
              className="w-full h-12 bg-black/40 border border-white/10 rounded-[12px] px-4 text-white focus:outline-none focus:border-[#10e7a0] transition-colors"
              placeholder="Juan Pérez"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block text-gray-300">Email</label>
            <input 
              name="email" 
              type="email" 
              required 
              className="w-full h-12 bg-black/40 border border-white/10 rounded-[12px] px-4 text-white focus:outline-none focus:border-[#10e7a0] transition-colors"
              placeholder="juan@ejemplo.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block text-gray-300">Contraseña</label>
            <input 
              name="password" 
              type="password" 
              required 
              className="w-full h-12 bg-black/40 border border-white/10 rounded-[12px] px-4 text-white focus:outline-none focus:border-[#10e7a0] transition-colors"
              placeholder="••••••"
            />
          </div>
          
          <div className="flex flex-col gap-2 mt-2">
            <label className="text-sm font-medium text-gray-300">Tipo de cuenta</label>
            <label className="flex items-center gap-3 p-3 rounded-[12px] border border-white/10 bg-white/5 cursor-pointer">
              <input type="radio" name="tipo" value="individual" defaultChecked className="accent-[#10e7a0]" />
              <div>
                <div className="font-medium">Para mí</div>
                <div className="text-xs text-gray-400">Generar rutinas y anotar mi peso.</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-[12px] border border-white/10 bg-white/5 cursor-pointer">
              <input type="radio" name="tipo" value="negocio_liviano" className="accent-[#10e7a0]" />
              <div>
                <div className="font-medium">Para mis clientes</div>
                <div className="text-xs text-gray-400">Entrenador/Nutricionista.</div>
              </div>
            </label>
          </div>

          <button 
            type="submit" 
            className="w-full h-12 mt-4 bg-[#10e7a0] text-black font-semibold rounded-[12px] hover:bg-[#0ed593] active:scale-[0.98] transition-transform"
          >
            Registrarse
          </button>
        </form>
      </div>
    </div>
  );
}
