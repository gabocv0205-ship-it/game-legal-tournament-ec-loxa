# Expansion incremental 2026-06-23

## Alcance implementado

- Perfil: carga, vista previa, compresion, actualizacion y eliminacion de foto de perfil y logo del cliente.
- Equipos: datos de dirigente por equipo con nombre, celular, correo opcional y observaciones.
- Sorteo: efectos de sonido discretos, modo presentacion, esfera animada, seleccion de cabezas de grupo, revelacion de equipos y registro de historial del sorteo automatico.
- Finanzas: exportacion de movimientos en CSV, Excel compatible `.xlsx` y vista imprimible/PDF, con filtros por fecha e historial.
- Notificaciones: modulo para preparar comunicaciones por WhatsApp a dirigentes y guardar historial.

## Migracion requerida

Ejecutar en Supabase SQL Editor el contenido completo de:

```text
supabase/feature_expansion_2026_06_23.sql
```

Debe ejecutarse despues de las migraciones de SaaS y hardening porque reutiliza `public.can_manage_tournament`.

La migracion es aditiva:

- No elimina columnas ni tablas.
- Usa `if not exists`.
- Crea politicas RLS para `draw_history`, `financial_exports`, `notification_logs` y Storage `profile-assets`.
- Agrega columnas opcionales a `profiles` y `teams`.
- Crea indice unico de celular de dirigente por torneo solo si no existen duplicados previos.

## Compatibilidad

- Los equipos existentes siguen funcionando aunque no tengan dirigente registrado.
- Las finanzas siguen usando `financial_ledger` cuando existe y caen a `payments` si aun no hay libro transaccional.
- El sorteo sigue actualizando `teams.group_name`; los efectos y cabezas de grupo envuelven la operacion existente.
- Las notificaciones no dependen de Twilio/Meta todavia: preparan WhatsApp y registran historial sin enviar mensajes automaticos en segundo plano.
- El audio usa Web Audio generado en navegador solo para efectos puntuales; no hay musica ambiente ni controles visibles.

## Pruebas realizadas

- `npm.cmd run test`: 11 pruebas pasadas.
- `npm.cmd run lint`: sin errores ni warnings.
- `npm.cmd run build`: compilacion de produccion correcta con variables dummy de Supabase.

## Archivos principales modificados

- `app/dashboard/perfil/page.tsx`
- `app/dashboard/equipos/page.tsx`
- `app/dashboard/sorteo/page.tsx`
- `app/dashboard/finanzas/page.tsx`
- `app/dashboard/layout.tsx`
- `app/dashboard/notificaciones/page.tsx`
- `app/page.tsx`
- `lib/audioExperience.ts`
- `lib/exportUtils.ts`
- `lib/imageClient.ts`
- `supabase/feature_expansion_2026_06_23.sql`
