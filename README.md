# Game Legal Tournament

Aplicacion para administrar torneos, construida con Next.js y Supabase.

## Primeros pasos

Instala las dependencias:

```bash
npm install
```

Crea un archivo `.env.local` a partir de `.env.example` y reemplaza los valores
de ejemplo con las credenciales de tu proyecto Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY` es secreta. Nunca debe exponerse en codigo cliente,
capturas o repositorios publicos.

Para preparar la integración entre Bóveda de Clientes y Tesorería SaaS, ejecuta
una vez `supabase/saas_setup.sql` desde el SQL Editor de Supabase. La migración
no elimina datos y crea las columnas, tabla e índices requeridos.

Inicia el servidor:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Verificacion

```bash
npm run lint
npm test
npm run build
```

Antes de un lanzamiento publico, ejecuta `supabase/production_hardening.sql`
despues de `supabase/saas_setup.sql` y sigue `PRELAUNCH-OPERATIONS.md`.
