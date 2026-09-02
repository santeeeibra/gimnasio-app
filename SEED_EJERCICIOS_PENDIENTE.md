# Pendiente de seed — catálogo de ejercicios para el sesgo femenino

> Tarea tuya (humano). No bloquea el resto del plan, pero sin esto el default
> "mujer → glúteos" + volumen alto genera planes repetitivos.

## Estado actual (`src/data/ejercicios.json`, 53 ejercicios)

- `gluteos`: **5** — hip-thrust, puente-gluteo, patada-gluteo-polea,
  abduccion-maquina, hip-thrust-una-pierna.
- `isquios`: **6** — peso-muerto-rumano (+mancuernas / +una-pierna),
  curl-femoral, buenos-dias, curl-nordico.

Para un plan con énfasis en glúteos a volumen medio/alto conviene tener ~8–10
opciones de glúteo con variedad de equipo y patrón.

## Verificar en la base

```bash
node -e 'const e=require("./src/data/ejercicios.json");const g={};for(const x of e){(g[x.grupo_muscular]??=[]).push(x.slug)}console.log(g.gluteos,g.isquios)'
```

## Ejercicios sugeridos para agregar a `ejercicios.json`

Mismo shape que el resto (`slug, nombre, grupo_muscular, patron, equipo, nivel,
descripcion, imagen_url`). `imagen_url` puede quedar en `null`, la app degrada
bien; si querés foto, buscar el nombre en
`https://github.com/yuhonas/free-exercise-db`.

| slug | nombre | grupo | patron | equipo | nivel |
|---|---|---|---|---|---|
| `peso-muerto-sumo` | Peso muerto sumo | gluteos | dominante_cadera | barra | intermedio |
| `hip-thrust-maquina` | Hip thrust en máquina | gluteos | dominante_cadera | maquina | principiante |
| `patada-gluteo-mancuerna` | Patada de glúteo con mancuerna | gluteos | aislamiento | mancuernas | principiante |
| `abduccion-polea-baja` | Abducción de cadera en polea | gluteos | aislamiento | polea | principiante |
| `extension-cadera-banco` | Extensión de cadera en banco 45° | gluteos | dominante_cadera | maquina | principiante |
| `subida-cajon` | Subida al cajón con mancuernas | gluteos | dominante_rodilla | mancuernas | intermedio |
| `sentadilla-sumo-mancuerna` | Sentadilla sumo con mancuerna | gluteos | dominante_rodilla | mancuernas | principiante |
| `buenos-dias-mancuerna` | Buenos días con mancuerna | isquios | dominante_cadera | mancuernas | principiante |
| `curl-femoral-sentado` | Curl femoral sentado | isquios | aislamiento | maquina | principiante |

## Aplicar

```bash
node scripts/seed-ejercicios.mjs
```

Idempotente (upsert por slug). Requiere `NEXT_PUBLIC_SUPABASE_URL` y
`SUPABASE_SERVICE_ROLE_KEY` en `.env.local`.
