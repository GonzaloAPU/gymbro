# Términos y privacidad del prototipo

Responsable declarado: **Envy11Estudio**. Contacto: **gonzaloc1704@outlook.com**.

El texto completo vive en `shared/legal-documents.json`, compartido por API y APK.
Versión inicial: `2026-10-22.1`. Se puede leer sin conexión en la APK.
Es un borrador para revisión profesional: falta confirmar la identificación legal completa,
domicilio del responsable, países de lanzamiento, condiciones de las transferencias
internacionales y una política concreta de conservación y eliminación de respaldos.
Aceptar un texto no garantiza inmunidad legal ni reemplaza medidas de seguridad.

## Activar sobre el Supabase existente

1. Antes de subir este backend a Render, ejecutar **solo**
   `backend/sql/supabase/04-legal-consents.sql` en SQL Editor como administrador.
   Es aditivo e idempotente: conserva cuentas y entrenamientos.
   No volver a ejecutar `01-bootstrap.sql` ni recrear el rol o su contraseña.
2. Verificar que devuelve la versión `20261022_legal`. Ahora hay 16 tablas.
3. Publicar la rama `render` y esperar a que Render despliegue el código nuevo.
4. Instalar la APK actualizada. Las APK anteriores no incluyen la aceptación
   y ya no podrán registrar cuentas o escribir datos protegidos por este permiso.
   La compilación con estos cambios es `Gymbro-0.3.1.apk` (versionCode 3).
5. Probar registro, login de cuenta existente, rechazo de casillas obligatorias,
   permiso deportivo opcional, retiro del permiso y visibilidad del ranking.

Para una base local, `npm run db:migrate --workspace backend` incluye esta migración.
Para una instalación nueva, `01-bootstrap.sql` ya incluye los cambios y luego se aplica
`02-backend-role.sql` una sola vez. Nunca poner secretos reales en los archivos del repo.

## Qué registra la aplicación

`legal_acceptances` conserva usuario, fecha del servidor, versión, SHA-256 del documento,
copia del texto y las cuatro decisiones. No se guardan IP, contraseña o token en el recibo.
El rol del backend tiene SELECT e INSERT: no puede modificar o borrar recibos anteriores.
Cada nueva aceptación o retiro agrega una fila. Las cuentas existentes no reciben una
aceptación ficticia durante la migración.

Los términos, lectura de privacidad y confirmación de 18 años son obligatorios. El permiso
para datos deportivos es independiente y opcional; sin él se permite consultar la cuenta,
pero se rechazan nuevas cargas deportivas. Gemini conserva su consentimiento adicional.

`users.leaderboard_opt_in` empieza en false para todas las cuentas. La persona puede
habilitarlo en Perfil → Privacidad; retirar el permiso deportivo también lo desactiva.
El ojo del peso sigue siendo una preferencia local, no un permiso de publicación.

Perfil → Privacidad permite gestionar permisos y abrir un correo para solicitar acceso,
corrección, exportación o eliminación. **La eliminación física no está automatizada**:
el responsable debe verificar identidad, atender la solicitud y tratar respaldos y datos
dependientes según las obligaciones aplicables. No confundir borrado lógico con supresión.

## URLs y contratos

Después del despliegue:

- Política legible y pública: `https://gymbro-api-t7mg.onrender.com/api/legal/privacy`
- Términos legibles y públicos: `https://gymbro-api-t7mg.onrender.com/api/legal/terms`
- `GET /api/legal/documents`: texto y hash, sin token.
- `GET /api/legal/status`: estado de la cuenta autenticada.
- `POST /api/legal/accept`: versión actual, `termsAccepted: true`,
  `privacyAcknowledged: true`, `adultConfirmed: true`, `sportsDataConsent: boolean`.
- `POST /api/legal/withdraw-sports`: retiro explícito del permiso anterior; no acepta
  automáticamente una nueva versión de términos.
- `POST /api/auth/register`: los mismos campos dentro de `legal`, además de credenciales.

Una versión pendiente produce HTTP 428 con `LEGAL_ACCEPTANCE_REQUIRED`; una carga
deportiva sin permiso produce `SPORTS_CONSENT_REQUIRED`. La API es la autoridad.
Para no romper la recuperación sin conexión, la navegación puede usar durante siete días
el último estado confirmado para esa cuenta y versión; eso no autoriza escrituras en API.

No editar una versión ya aceptada: incrementar `version` y `updatedAt` cuando cambie el
contenido, revisar finalidades y probar el flujo de nueva aceptación.

Referencia oficial para revisar derechos en Argentina:
https://www.argentina.gob.ar/aaip/datospersonales/derechos
