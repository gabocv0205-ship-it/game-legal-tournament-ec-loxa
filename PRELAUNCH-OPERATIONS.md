# Operacion previa al lanzamiento

## Orden de despliegue

1. Crear un backup manual en Supabase antes de aplicar cambios.
2. Ejecutar `supabase/saas_setup.sql`.
3. Ejecutar `supabase/production_hardening.sql`.
4. Ejecutar `supabase/verify_production_hardening.sql` y conservar el resultado.
5. Ejecutar `npm test`, `npm run lint` y `npm run build`.
6. Validar con dos usuarios de organizaciones diferentes que no puedan consultar ni modificar datos ajenos.

## Prueba de restauracion de backup

Esta prueba requiere acceso real al proyecto Supabase y no debe marcarse como completada hasta ejecutarla.

1. Crear un proyecto Supabase temporal de restauracion.
2. Restaurar el backup mas reciente en el proyecto temporal.
3. Verificar conteos de `tournaments`, `teams`, `players`, `matches`, `match_events`, `payments` y `financial_ledger`.
4. Abrir un torneo restaurado y comprobar equipos, calendario, resultados, finanzas y portal publico.
5. Registrar fecha, responsable, duracion y diferencias encontradas.

## Auditoria RLS minima

- Dos organizaciones no pueden leer ni modificar datos privados entre si.
- Un rol `finance` puede operar finanzas, pero no partidos.
- Un rol `referee` puede operar partidos y eventos, pero no pagos.
- Un rol `viewer` solo puede leer.
- Un usuario anonimo nunca puede leer cedulas, pagos, auditoria o libro financiero.
- La ultima consulta de `verify_production_hardening.sql` devuelve cero politicas inesperadas.
- Un pago confirmado no puede editarse; toda correccion genera un reverso y un nuevo pago.

## Pilotos reales

Ejecutar entre 3 y 5 torneos completos antes del lanzamiento autoservicio. No marcar como realizado sin evidencia.

Registrar por piloto: organizador, formato, equipos, pagos, reprogramaciones, tarjetas, suspensiones, penales, incidentes, tiempo de solucion y encuesta final.

## Criterios de salida

- Cero fugas de datos entre organizaciones.
- Cero clasificaciones o suspensiones incorrectas.
- Cero movimientos financieros sin trazabilidad.
- Restauracion de backup aprobada.
- Al menos tres pilotos terminados y un organizador capaz de operar sin asistencia constante.
