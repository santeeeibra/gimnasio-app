# Plan de Monetización Orgánica y Crecimiento — SysGym
> **Enfoque**: Desarrollador solo, sin contactos corporativos previos, app 100% gratuita para el usuario final y monetización pasiva sin fricción ni desconfianza.

---

## 🎯 Filosofía Central
1. **Cero venta cara a cara a dueños desconfiados por ahora**: El crecimiento viene desde los atletas/usuarios (Bottom-Up).
2. **Sin barreras de pago**: Todo el tracking de entrenamiento, series y descansos es libre y gratuito.
3. **Monetización indirecta limpia**: Cero anuncios molestos de pantalla completa que interrumpan series.

---

## 🗺️ Fases del Plan

### Fase 1: Afiliación Abierta y Contextual (Inmediata - Cero Contactos)
No requiere hablar con nadie ni contratos previos.
- [ ] **1.1 Alta en programas públicos**: Crear cuenta de afiliado en Mercado Libre / Amazon Afiliados.
- [ ] **1.2 Configuración centralizada**: Crear archivo de configuración `src/lib/monetizacion/afiliados.ts` con links, tags de referido y productos recomendados según categoría.
- [ ] **1.3 Integración contextual en ejercicios**:
  - Peso Muerto / RDL / Jalones ➔ Sugerencia discreta: *"Equipamiento recomendado: Straps / Muñequeras"*.
  - Sentadilla pesada / Prensa ➔ Sugerencia: *"Cinturón lumbar / Zapatillas planas"*.
- [ ] **1.4 Calculadora / Sección de Suplementación**:
  - Calculadora de creatina (0.1g/kg) y proteína diaria con botón: *"Ver opciones de Creatina Monohidrato recomendada"*.

---

### Fase 2: Tracción Orgánica y Efecto "Caballo de Troya"
Hacer que la gente que entrena use la app en sala sin forzar ventas.
- [ ] **2.1 Onboarding ultra-rápido para amigos**: Enlace directo para compartir rutina o progreso en historias de Instagram (con card visual atractiva de SysGym).
- [ ] **2.2 Contacto directo con entrenadores jóvenes / creadores**:
  - Identificar 5-10 entrenadores en IG/TikTok de 2k-10k seguidores que vendan rutinas en PDF.
  - Ofrecerles digitalizar su rutina en SysGym gratis para sus alumnos.
  - Beneficio: Ellos promocionan la app gratis para darle una mejor experiencia a sus alumnos.

---

### Fase 3: Publicidad Voluntaria (Rewarded Ads)
- [ ] **3.1 Cuenta en Google AdMob**: Configurar cuenta como desarrollador independiente.
- [ ] **3.2 Recompensas opcionales (Cero invasión)**:
  - Ver video de 15 segundos para desbloquear: exportar informe PDF de progreso, comparativa de volumen de últimos 6 meses, o temas visuales exclusivos.
  - El usuario siempre decide si ver el anuncio o no.

---

### Fase 4: Transición a B2B con Tracción Real
- [ ] **4.1 Métricas de uso demostrables**: Cuando un gimnasio tenga 15-20 socios usando la app a diario, el dueño ya no desconfía porque ve el valor funcionando en sus propias instalaciones.
- [ ] **4.2 Demo en mano**: Mostrarle al dueño la pantalla con datos reales de sus propios socios usándola.

---

## 📋 Próximo Paso Inmediato para Programar:
Implementar el módulo base de **Afiliación Contextual** en la app:
1. `src/lib/monetizacion/afiliados.ts`: Base de datos de productos por tipo de ejercicio.
2. Componente de UI `<EquipamientoSugerido />` integrado sutilmente en el detalle del ejercicio o descanso, respetando el diseño Apple / Liquid Glass.
