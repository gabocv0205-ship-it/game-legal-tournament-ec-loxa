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

Inicia el servidor:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Verificacion

```bash
npm run lint
npm run build
```
