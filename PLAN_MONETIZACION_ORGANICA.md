# Plan de Monetización Orgánica y Crecimiento — SysGym (v2 Revisado)
> **Enfoque**: Desarrollador solo, app 100% gratuita para el usuario final, crecimiento Bottom-Up (atletas y entrenadores) para luego cerrar gimnasios B2B con métricas de uso reales en mano.

---

## 🎯 Principios Fundamentales
1. **El valor real está en los Entrenadores y Atletas (Bottom-Up)**: Si 50 socios usan la app en un gimnasio, el dueño no desconfía porque ve la retención con sus propios ojos.
2. **Cero spam en la UI**: Ningún banner intrusivo, ninguna publicidad encubierta que dañe la confianza.
3. **Métricas antes de vender**: No ir a venderle a un dueño sin antes mostrarle: *"X personas de tu propio gimnasio entrenan con SysGym hoy"*.

---

## 🗺️ Fases Estratégicas (Ordenadas por ROI Real)

### Fase 1: Motor de Crecimiento con Entrenadores / Creadores (Prioridad #1)
El verdadero motor de crecimiento orgánico y credibilidad.
- [ ] **1.1 Mapeo de 10 entrenadores independientes**:
  - Buscar en Instagram / TikTok perfiles de 2k a 15k seguidores que vendan asesorías o rutinas en formato PDF.
- [ ] **1.2 Propuesta de valor de igual a igual**:
  - Ofrecerles digitalizar sus rutinas en SysGym con su nombre de coach.
  - Para ellos: una experiencia premium con cronómetro y tracking para sus alumnos (en vez de un PDF incómodo).
  - Para SysGym: decenas de usuarios activos diarios reales sin gastar $1 en pauta.
- [ ] **1.3 Flujo de onboarding con código de entrenador**:
  - Los alumnos ingresan con el enlace del entrenador y cargan su rutina automáticamente.

---

### Fase 2: Instrumentación de Métricas de Uso y Retención
Preparar la base técnica para poder venderle al dueño de gimnasio.
- [ ] **2.1 Contador de Atletas Activos por Gimnasio**:
  - Métricas agregadas: cuántas personas entrenaron esta semana, días más concurridos, volumen promedio.
- [ ] **2.2 Reporte de Retención**:
  - Indicador de alumnos que dejaron de registrar entrenamientos hace más de 10 días (alerta de abandono).
- [ ] **2.3 Control de Costos de Infraestructura**:
  - Mantener optimizadas las queries de Supabase para evitar pasarse de los límites gratuitos antes de monetizar.

---

### Fase 3: Transición B2B con Tracción Comprobada
Cuando la app ya se use en 1 o 2 gimnasios físicos:
- [ ] **3.1 Visita con datos reales**:
  - Ir con el celular y mostrarle al dueño: *"Tenés 25 alumnos usando esto acá. Te doy el panel de administración para que los profes armen las rutinas oficiales y no pierdas socios por falta de seguimiento"*.
- [ ] **3.2 Cobro mensual SaaS al gimnasio**:
  - Abono mensual en pesos/dólares por gimnasio. Los alumnos siguen usándola 100% gratis.

---

### Fase 4: Afiliación Oficial Mercado Libre (Canal Secundario Pasivo)
*Actualmente preparado pero apagado bajo Feature Flag (`NEXT_PUBLIC_HABILITAR_AFILIADOS=false`)*.
- [ ] **4.1 Alta en Mercado Libre Afiliados**:
  - Obtener los enlaces oficiales acortados (`https://mercadolibre.com/sec/...`).
- [ ] **4.2 Activación quirúrgica**:
  - Solo se muestra en ejercicios axiales/pesados clave (Peso Muerto, Sentadilla, Press con barra).
  - Incluye divulgación legal obligatoria de afiliado.
