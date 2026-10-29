# Configuración del sistema de licencias

El panel `admin/` es una página estática que puedes desplegar en Vercel. La creación y el canje de claves se ejecutan en Supabase Edge Functions; la clave `service_role` nunca debe copiarse al navegador, al repositorio ni a la app Android.

## 1. Configurar Supabase

1. Instala Supabase CLI y vincula este proyecto:

   ```powershell
   supabase login
   supabase link --project-ref dgnmaczzfxtslgfiosqr
   ```

2. Aplica la tabla y la función SQL:

   ```powershell
   supabase db push
   ```

3. En Supabase, crea tu usuario en **Authentication → Users**. La cuenta debe usar correo y contraseña.

4. Autoriza ese correo para generar claves:

   ```powershell
   supabase secrets set ADMIN_EMAILS=tu-correo@ejemplo.com
   ```

   Se pueden autorizar varios correos separados por comas. Las funciones también usan los secretos de proyecto `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`, que Supabase proporciona en el entorno de Edge Functions. **No los guardes en el repositorio.**

5. Despliega las funciones:

   ```powershell
   supabase functions deploy create-license
   supabase functions deploy redeem-license
   ```

   Ambas funciones verifican autorización en su código. `create-license` consulta la sesión y compara el correo con `ADMIN_EMAILS`; `redeem-license` permite canjear códigos desde la app.

## 2. Desplegar el panel en Vercel

1. Importa el repositorio en Vercel.
2. Configura **Root Directory** como `admin/`.
3. Usa el preset **Other** y publica los archivos estáticos (sin comando de build).
4. Crea la cuenta autorizada en Supabase Authentication e inicia sesión en el panel.

La URL del proyecto y la publishable key de `admin/config.js` son valores públicos. La publishable key no sustituye a la validación del servidor; la tabla tiene RLS y no permite leer ni escribir licencias con esa key. No agregues claves `service_role` a `admin/config.js`.

## 3. Activar la app Android

La app conserva un identificador aleatorio de instalación y canjea la clave llamando a `redeem-license`. Una clave solo se acepta una vez; reintentos desde la misma instalación son idempotentes. Al tener éxito, el desbloqueo se guarda localmente para que la app siga abriendo sin conexión. Tras borrar los datos o reinstalar, la instalación cambia y se debe pedir una recuperación manual.

El estado local permite el uso sin conexión, pero no es una licencia criptográfica resistente a la modificación del APK. No distribuyas una compilación de producción hasta probar el canje, el acceso del panel y las políticas RLS en el proyecto Supabase.
