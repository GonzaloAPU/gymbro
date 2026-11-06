# Gymbro web en GitHub Pages

Trabajo en la rama `web`. El tag `backup/pre-web-2026-11-06` conserva la versión anterior de Android en `render`.

## Arquitectura y funciones

GitHub Pages aloja HTML, CSS, imágenes y JavaScript. La API Express sigue en Render y los datos en Supabase. No se publica Node.js, PostgreSQL ni claves en Pages.

Ingreso, registro, recuperación por EmailJS, perfil, catálogo, rutinas locales/Gemini, cupo semanal, entrenamiento, progreso, ranking y sincronización usan la misma API. Los datos locales del navegador son propios de ese origen y dispositivo: no se transfieren automáticamente los datos todavía sin sincronizar de la APK.

Las alarmas web requieren mantener la página abierta y permitir audio/notificaciones; con la pestaña suspendida o cerrada no tienen las garantías de Android. Se conservan las lecturas persistentes y la cola local; esta versión no instala un service worker para volver a abrir todo el sitio sin conexión.

## Compilar

```powershell
npm ci
npm run build:web
```

Publicar únicamente `frontend/dist/gymbro-web/browser/`. La compilación incorpora el origen público de API y la navegación hash en metadatos del index. La ruta prevista es `https://gonzaloapu.github.io/gymbro/#/login`.

`npm run build` y Capacitor mantienen su salida anterior `frontend/dist/smartgymbro/browser/`: no se usan los metadatos web en el APK.

Parámetros públicos opcionales de compilación (no son secretos):

```powershell
$env:GYMBRO_WEB_BASE_PATH='/gymbro/'
$env:GYMBRO_WEB_API_URL='https://gymbro-api-t7mg.onrender.com'
npm run build:web
```

Para un dominio propio, usar `/` como base. Las rutas hash permiten recargar cualquier pantalla sin necesitar redirecciones de servidor en GitHub Pages.

## Antes de publicar

1. En Render, configurar `FRONTEND_URL=https://gonzaloapu.github.io`, SIN `/gymbro/`. Es el origen CORS; el backend existente también permite `https://localhost` de Android. Guardar/reiniciar el servicio. No cambiar JWT_SECRET ni la conexión de Supabase para esta publicación.
2. Verificar que `PUBLIC_API_URL` siga apuntando a `https://gymbro-api-t7mg.onrender.com` para los enlaces de recuperación. Las claves de EmailJS y Gemini permanecen solo en Render.
3. En GitHub, Settings → Pages → Build and deployment → Source: GitHub Actions. Si el environment github-pages limita las ramas, permitir `web`.
4. Subir la rama web: el push inicia automáticamente el workflow «Publicar Gymbro web». Este solo despliega desde web; cada ejecución valida pruebas y tipos antes de subir el sitio. No modificar la fuente de despliegue del backend Render, que sigue siendo render.
5. Opcionalmente definir la variable de Actions `GYMBRO_WEB_API_URL` si cambia la API. El workflow obtiene automáticamente la ruta base de Pages.

No se requieren secretos de PostgreSQL, EmailJS, Gemini ni claves personales de GitHub para compilar o publicar el frontend. El workflow usa GITHUB_TOKEN con los permisos limitados de Pages.

## Verificación posterior a la publicación

- Abrir el sitio, entrar por `/#/login` bajo su ruta base y recargar; las rutas internas deben seguir funcionando.
- Confirmar en Network que las llamadas /api terminan en la API HTTPS y que el preflight CORS autoriza el origen del sitio.
- Probar con una cuenta de prueba: registro, ingreso, recuperación, generación local y con Gemini (consume cupo), serie, finalización, progreso y ranking.
- Cortar la conexión con una sesión ya abierta, guardar una serie y restablecerla: comprobar la sincronización sin duplicar registros.
- Probar sonido/notificaciones con la página abierta. Cerrar la pestaña no equivale al comportamiento de las alarmas Android.

Los tests simulan correo y Gemini; compilar correctamente no confirma la entrega real de correos ni el estado de servicios externos. La revisión de seguridad pendiente sigue siendo necesaria antes del lanzamiento público.

Preparación comprobada el 06/11/2026: 229 pruebas backend, 173 frontend y 31 SQL aprobadas (433 en total), más verificadores de flujos; tipos y ambas compilaciones correctos. La navegación y recarga de una ruta hash se comprobaron en un navegador con la salida estática. El sitio público y sus integraciones se verifican después de configurar Render y Pages.

Referencias: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages y https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
