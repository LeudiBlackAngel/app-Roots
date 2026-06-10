# FitApp — Fase 0 (Setup + Auth + RLS)

App de entrenamiento, dietas y tienda fit. Esta fase deja el proyecto
**desplegable**, con **autenticación** (email + contraseña), tabla `profiles`
con **rol**, y **RLS activado desde el día 1**.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS v4 ·
Supabase (Auth + Postgres) con `@supabase/ssr` · deploy en Vercel.

---

## Estructura relevante

```
src/
  app/
    layout.tsx          # Layout base + navegación
    page.tsx            # Landing pública (/)
    login/page.tsx      # /login
    registro/page.tsx   # /registro
    dashboard/page.tsx  # /dashboard (privada, saluda por nombre)
    admin/page.tsx      # /admin (solo role = 'admin')
  components/
    nav.tsx             # Barra de navegación (login / cerrar sesión)
    auth-form.tsx       # Formulario de login/registro (cliente)
  lib/
    auth.ts             # getUser / getProfile / getUserRole (server-side)
    auth-actions.ts     # Server Actions: login, registro, signOut
    supabase/
      client.ts         # Cliente para componentes de cliente (browser)
      server.ts         # Cliente para Server Components / route handlers
      middleware.ts     # Helper que refresca la sesión y protege rutas
middleware.ts           # Middleware raíz (usa el helper de arriba)
supabase/schema.sql     # Tabla profiles + trigger + políticas RLS
.env.example            # Variables de entorno documentadas
```

---

## Puesta en marcha (resumen)

### 1. Crear el proyecto en Supabase
1. Entra a <https://supabase.com/dashboard> y crea un proyecto nuevo.
2. Elige una contraseña para la base de datos y una región cercana.

### 2. Sacar las 2 variables de entorno
En el dashboard del proyecto: **Project Settings → API** (o **Data API**):
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon / public / publishable key** → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Copia ambas a tu `.env.local` (ya existe con los nombres listos):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...
```

> Las dos son **públicas** (van al navegador). Lo que protege tus datos es la
> **RLS**, no esconder la anon key. **Nunca** uses aquí la `service_role` key.

### 3. Correr el SQL
1. En Supabase abre **SQL Editor → New query**.
2. Pega el contenido de [`supabase/schema.sql`](./supabase/schema.sql).
3. Pulsa **Run**. Crea la tabla `profiles`, el trigger que genera el perfil al
   registrarse, y las políticas RLS.

### 4. Correr en local
```bash
npm install
npm run dev
```
Abre <http://localhost:3000>. Regístrate en `/registro` y entra a `/dashboard`.

> **Confirmación de email:** por defecto Supabase pide confirmar el correo. Para
> probar más rápido puedes desactivarla en **Authentication → Providers → Email →
> "Confirm email" (off)**, o confirmar el usuario manualmente desde
> **Authentication → Users**.

### 5. Hacer admin a un usuario (opcional)
En el SQL Editor:
```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'tucorreo@ejemplo.com');
```
Luego ese usuario podrá entrar a `/admin`.

### 6. Desplegar en Vercel
1. Sube el repo a GitHub.
2. En <https://vercel.com> → **Add New → Project** → importa el repo.
3. En **Environment Variables** añade las mismas dos:
   `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. **Deploy**. Vercel detecta Next.js automáticamente.
5. (Recomendado) En Supabase → **Authentication → URL Configuration** añade la
   URL de Vercel a *Site URL* / *Redirect URLs*.

---

## Notas de seguridad (Fase 0)
- RLS está activado en `profiles`: cada usuario solo ve/edita **su** fila.
- Un usuario **no puede** cambiar su propio `role` (lo bloquea un trigger).
- Un `admin` puede **leer** todas las filas.
- El perfil se crea solo vía trigger `SECURITY DEFINER`, no desde el cliente.

## Fuera de alcance (fases futuras)
Entrenamiento, dietas, tienda, pagos, panel admin real. No se instalaron
librerías de esas fases.
