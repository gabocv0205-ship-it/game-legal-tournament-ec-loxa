# Expansión incremental 2026-06-23

## Alcance implementado

- Perfil: carga, vista previa, compresión, actualización y eliminación de foto de perfil y logo del cliente.
- Equipos: datos de dirigente por equipo con nombre, celular, correo opcional y observaciones.
- Sorteo: experiencia audiovisual opcional, modo presentación, esfera animada, revelación de equipos y registro de historial del sorteo automático.
- Finanzas: exportación de movimientos en CSV, Excel compatible `.xlsx` y vista imprimible/PDF, con filtros por fecha e historial.
- Notificaciones: módulo para preparar comunicaciones por WhatsApp a dirigentes y guardar historial.
- Visitantes: control opcional de audio en la portada pública, sin reproducción automática.

## Migración requerida

Ejecutar en Supabase SQL Editor:

```sql
supabase/feature_expansion_2026_06_23.sql
```

Debe ejecutarse después de las migraciones de SaaS y hardening porque reutiliza `public.can_manage_tournament`.

La migración es aditiva:

- No elimina columnas ni tablas.
- Usa `if not exists`.
- Crea políticas RLS para `draw_history`, `financial_exports`, `notification_logs` y Storage `profile-assets`.
- Agrega columnas opcionales a `profiles` y `teams`.
- Crea índice único de celular de dirigente por torneo solo si no existen duplicados previos.

## Compatibilidad

- Los equipos existentes siguen funcionando aunque no tengan dirigente registrado.
- Las finanzas siguen usando `financial_ledger` cuando existe y caen a `payments` si aún no hay libro transaccional.
- El sorteo sigue actualizando `teams.group_name`; la experiencia audiovisual solo envuelve la operación existente.
- Las notificaciones no dependen de Twilio/Meta todavía: preparan WhatsApp y registran historial sin enviar mensajes automáticos en segundo plano.
- El audio usa Web Audio generado en navegador, sin archivos externos y sin autoplay.

## Pruebas realizadas

- `npm.cmd run test`: 11 pruebas pasadas.
- `npm.cmd run lint`: sin errores ni warnings.
- `npm.cmd run build`: compilación de producción correcta con variables dummy de Supabase.

## Archivos principales modificados

- `app/dashboard/perfil/page.tsx`
- `app/dashboard/equipos/page.tsx`
- `app/dashboard/sorteo/page.tsx`
- `app/dashboard/finanzas/page.tsx`
- `app/dashboard/layout.tsx`
- `app/dashboard/notificaciones/page.tsx`
- `app/page.tsx`
- `components/AudioExperienceControls.tsx`
- `lib/audioExperience.ts`
- `lib/exportUtils.ts`
- `lib/imageClient.ts`
- `supabase/feature_expansion_2026_06_23.sql`
