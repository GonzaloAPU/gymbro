# Recuperación de contraseña con EmailJS

## Flujo implementado

1. «Olvidé mi contraseña» en el acceso lleva a `/recuperar-contrasena`.
2. La API recibe el correo y devuelve la misma confirmación exista o no la cuenta.
3. Si existe, el backend envía un correo mediante EmailJS. No se envían contraseñas.
4. El enlace abre `/api/auth/reset-password#token=...` en el navegador, también desde Android.
5. El usuario escribe la nueva contraseña y su confirmación. Después vuelve a Gymbro e inicia sesión.

El formulario está incluido en la API: no requiere contratar otro alojamiento ni publicar
el frontend Angular para que los enlaces funcionen desde una APK.

## Activar en una instalación existente

Primero aplicar `backend/sql/supabase/05-password-recovery.sql` en el SQL Editor de Supabase,
como administrador. Es una migración aditiva y repetible: agrega `users.password_changed_at`
y no reemplaza contraseñas ni elimina cuentas. En desarrollo también está incluida en
`npm run db:migrate`. No se ejecutó contra bases reales durante la implementación.

En EmailJS, reutilizar el servicio de correo existente y crear una plantilla **nueva**
para Gymbro, para conservar la plantilla de la otra página:

- **To Email:** `{{to_email}}`.
- **Subject:** `Recuperá tu contraseña de Gymbro`.
- **From Name:** `Gymbro`.
- **From Email:** el remitente autorizado del servicio conectado.
- Copiar el cuerpo de `backend/email-templates/password-reset.html`.
- Reemplazar `https://TU-API.onrender.com` por la URL HTTPS real de la API.
- Mantener fijo ese dominio en el botón; usar únicamente `{{reset_token}}` como parte dinámica del enlace.

Configurar estas variables **solo en Render/backend**, nunca en Angular ni dentro de la APK:

```dotenv
PUBLIC_API_URL=https://TU-API.onrender.com
EMAILJS_SERVICE_ID=service_...
EMAILJS_TEMPLATE_ID=template_...
EMAILJS_PUBLIC_KEY=...
EMAILJS_PRIVATE_KEY=...
```

EmailJS debe permitir las llamadas desde el servidor y reconocer su clave privada.
Consultar [API de envío](https://www.emailjs.com/docs/rest-api/send/) y
[opciones del SDK, incluida autorización privada](https://www.emailjs.com/docs/sdk/options/).
Si se modifican opciones de seguridad compartidas de la cuenta, comprobar también la
otra página: una exigencia global de clave privada puede afectar un formulario público.
No pegar claves en el chat ni confirmarlas en Git.

Las cuotas y límites de EmailJS se comparten con los demás proyectos de esa cuenta.
Gymbro serializa sus envíos con 1,1 segundos entre solicitudes, pero no controla los
envíos de la otra página. No se enviaron correos reales durante las pruebas.

## Seguridad y límites

- Token firmado para recuperación, distinto de una sesión, con 15 minutos de vigencia.
- Firma ligada al hash actual de contraseña: cambiarla inutiliza todos los enlaces anteriores.
- Bloqueo de fila y nueva verificación dentro de la transacción: dos envíos simultáneos no consumen el enlace dos veces.
- bcrypt conserva solo el hash; se evita la truncación silenciosa por encima de 72 bytes.
- Después del cambio se invalidan los JWT previos, incluso los emitidos antes de esta función.
- Los JWT anteriores a esta función siguen válidos hasta que se restablece la contraseña o vencen.
- El enlace usa fragmento, no parámetros de consulta. El formulario lo retira de la barra de direcciones y no carga recursos externos.
- La página responde sin caché, sin referrer y con CSP que impide incrustarla en otros sitios.
- La solicitud tiene espera de un minuto por correo, máximo tres por 15 minutos y 30 globales por minuto. Estos límites están en memoria y se reinician al reiniciar el backend.
- La validación de enlaces se limita a diez intentos por enlace en 15 minutos y 60 globales por minuto; los tokens tampoco se guardan en claro para estos contadores.
- La entrega se procesa en segundo plano para no revelar cuentas por el tiempo de respuesta. Un fallo del proveedor se registra sin datos privados; el usuario puede pedir otro enlace tras la espera.
- Si faltan las credenciales, se devuelve 503 con un mensaje claro; no se afirma haber enviado un correo.

## Verificación antes de publicar

Las pruebas automatizadas cubren correo existente/inexistente, vencimiento, enlaces falsificados,
reutilización, concurrencia, hashes, invalidación de sesiones, contratos de EmailJS y migración repetible.
Para comprobar la entrega real: usar una cuenta propia de prueba, solicitar el enlace, cambiar
su contraseña, confirmar que el enlace ya no sirve y volver a iniciar sesión en Gymbro.
Esa prueba requiere configurar EmailJS y aplicar la migración antes del despliegue.
