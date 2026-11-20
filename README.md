# Venta de Refrescos — Etapa ll Edif.4 (V0.22)

Catálogo de refrescos con panel de administración protegido y catálogo compartido en
Supabase. El diseño original (HTML, CSS, colores, textos, animaciones, partículas y menú
de administración) se conserva tal cual; solo cambió la capa de datos y de acceso.

## Qué hace ahora

- El catálogo se lee desde la tabla `public.refresco_catalog` de Supabase, así que todos
  los teléfonos ven los mismos productos.
- El administrador entra con correo y contraseña reales (Supabase Auth) y solo las
  cuentas registradas en `public.admins` pueden escribir; el resto solo puede leer.
- Añadir, editar y eliminar refrescos guarda los cambios en la nube y las fotos se suben
  al bucket `refresco-images`.
- La página revisa la marca de tiempo del catálogo cada 8 segundos y al volver a la
  pestaña, de modo que los cambios aparecen solos en los demás teléfonos.
- Sin conexión a Supabase, la página sigue mostrando el catálogo local del dispositivo.

## Puesta en marcha (una sola vez)

1. Crea un proyecto en <https://supabase.com>.
2. En **SQL Editor**, ejecuta el contenido de `supabase/schema.sql`.
   Crea la tabla del catálogo, el bucket de fotos, las políticas RLS y la función
   `is_admin()`.
3. En **Authentication → Users** crea la cuenta del administrador (correo + contraseña).
4. Autorízala como administrador ejecutando, en el SQL Editor:

   ```sql
   insert into public.admins (user_id, email)
   select id, email from auth.users where email = 'TU-CORREO@EJEMPLO.COM'
   on conflict (user_id) do nothing;
   ```

5. En **Settings → Environment variables** de AppJet añade:
   - `SUPABASE_URL` — por ejemplo `https://tuproyecto.supabase.co`
   - `SUPABASE_ANON_KEY` — la clave **publishable / anon** (nunca la `service_role`)

   Opcional: `WHATSAPP_NUMBER` para cambiar el número de los pedidos.

Con esas dos variables la aplicación se conecta sola al catálogo compartido. Si faltan,
la página funciona en modo local y lo indica.

## Desarrollo local

```bash
npm start          # sirve la página en http://127.0.0.1:3000
npm run check      # verifica sintaxis, ids y la integración Supabase
```

`server.js` solo sirve el HTML original e inyecta la configuración pública
(`window.__APP_CONFIG__`); no contiene claves ni lógica de negocio.

## Estructura

| Archivo | Contenido |
| --- | --- |
| `pagina_web_refresco_V0.22_SOLO_HUELLA.html` | Página completa (diseño original + lógica de datos) |
| `server.js` | Servidor estático que inyecta la configuración de Supabase |
| `supabase/schema.sql` | Tabla, bucket, políticas RLS y permisos de administrador |
| `scripts/check.js` | Verificación del proyecto |
| `Dockerfile` | Imagen de publicación (Node LTS sobre Alpine) |
