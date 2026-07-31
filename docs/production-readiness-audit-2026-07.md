# Auditoria de preparacion para produccion

Fecha: 2026-07-31

## Resultado ejecutivo

La aplicacion tiene una base funcional comercializable para pilotos controlados: Next.js 15, Supabase, RLS por torneo, funciones RPC para operaciones sensibles, middleware de autenticacion, exportaciones y pruebas unitarias del motor deportivo. No se debe presentar todavia como una plataforma de alta disponibilidad sin completar la validacion de Supabase y los pilotos indicados en `PRELAUNCH-OPERATIONS.md`.

Estimacion orientativa de madurez del producto: **78% para un MVP comercial controlado** y **55% para una plataforma deportiva empresarial de alta disponibilidad**. La diferencia corresponde principalmente a observabilidad, pruebas end-to-end, restauracion comprobada, integraciones de pago/notificaciones y operacion 24/7.

## Hallazgos y tratamiento

### Aislamiento y seguridad

- Las rutas protegidas pasan por middleware y las operaciones administrativas usan `SUPABASE_SERVICE_ROLE_KEY` unicamente en servidor.
- El acceso a torneos se valida con `getAccessibleTournament`, membresias y las politicas RLS de Supabase.
- Los jugadores, partidos, eventos, pagos de equipos y libros financieros se filtran por `tournament_id`.
- La vista nueva `public_tournament_social_links` expone solo enlaces sociales y nombre publico; no expone correo, telefono, credenciales, facturacion ni datos de equipos.
- Las APIs de clientes y tesoreria validan que la sesion sea superadmin y rechazan solicitudes cross-origin.

Riesgo pendiente: la auditoria real de RLS requiere ejecutar `supabase/verify_production_hardening.sql` y probar con dos usuarios de organizaciones distintas en el proyecto Supabase de produccion. El repositorio no puede sustituir esa prueba de autorizacion contra la base real.

### Integridad financiera

- `financial_ledger` y `payments` siguen siendo el libro de cargos/pagos de equipos.
- `tournament_operating_transactions` es un libro separado para gastos e ingresos adicionales del torneo.
- `saas_invoices` y `saas_invoice_payments` son cuentas por cobrar del software y nunca reciben `tournament_id`.
- Los pagos SaaS nuevos se registran con bloqueo de fila en `record_saas_invoice_payment`, evitando cobros concurrentes por encima del saldo.
- Se conservan `saas_payments` y registros existentes para compatibilidad historica.

Riesgo pendiente: para contabilidad fiscal formal todavía se requiere numeracion fiscal, comprobantes autorizados, impuestos y conciliacion bancaria conforme al pais de operacion. Eso no debe improvisarse dentro del MVP.

### Rendimiento y mantenibilidad

- Se preservaron rutas, tablas existentes y componentes funcionales.
- La interfaz de finanzas carga los movimientos operativos bajo el torneo seleccionado y reutiliza las exportaciones existentes.
- La animacion premium se mantiene ligera y el landing publico no incorpora Framer Motion en su carga inicial.
- Hay consultas client-side con `select('*')` en algunos modulos antiguos. Funcionan para el volumen actual, pero conviene migrarlas gradualmente a selecciones explicitas y endpoints paginados cuando un torneo supere cientos de equipos/jugadores.

### Experiencia de usuario

- El alta de cliente solicita valor de licencia y vencimiento.
- Tesoreria muestra facturado, abonado, saldo y estado pendiente/abonado/pagado/vencido.
- El perfil permite enlaces sociales con validacion de URL.
- La pagina publica carga esos enlaces exclusivamente desde el torneo consultado.

## Requisitos antes del lanzamiento publico

1. Ejecutar la migracion `supabase/commercial_hardening_2026_07.sql` despues de las migraciones base.
2. Ejecutar `supabase/verify_production_hardening.sql` y conservar la salida.
3. Probar RLS con dos usuarios de organizaciones diferentes: lectura, insercion, actualizacion y eliminacion.
4. Ejecutar `npm test`, `npm run lint` y `npm run build` con variables de entorno de produccion.
5. Probar restauracion de backup y monitoreo de errores.
6. Realizar pilotos completos con 3 a 5 torneos y revisar exportaciones, cobros, estados vencidos y concurrencia.

## Segunda fase recomendada

- Facturacion fiscal y conciliacion bancaria.
- Pagos en linea con webhook idempotente.
- Observabilidad centralizada con alertas y trazas.
- Pruebas E2E automatizadas para alta de cliente, torneo, fixture, finanzas y portal publico.
- Paginacion server-side para plantillas, partidos y movimientos.
- Politica formal de retencion, exportacion y eliminacion de datos personales.
