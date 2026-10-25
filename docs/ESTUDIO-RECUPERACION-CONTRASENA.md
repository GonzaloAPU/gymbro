# Cómo funciona la recuperación de contraseña de Gymbro

La dirección del formulario es fija. La autorización temporal es variable.
El endpoint no desaparece después de 15 minutos: el backend deja de aceptar su token.

## 1. Endpoint, dirección y método

Un endpoint es una entrada de la API a la que se envía una petición HTTP.
El método indica qué operación se quiere realizar:

| Método y ruta | Recibe | Hace |
|---|---|---|
| POST /api/auth/forgot-password | Correo | Solicita el envío del enlace |
| GET /api/auth/reset-password | Petición del navegador | Entrega el formulario HTML |
| POST /api/auth/reset-password | Token y nueva contraseña | Valida y guarda el nuevo hash |

GET y POST pueden usar la misma dirección y ejecutar código distinto.
En backend/src/app.js se monta passwordRecoveryRouter bajo el prefijo /api/auth.
En backend/src/routes/password-recovery.js están los manejadores de esas operaciones.

## 2. Cómo se forma el enlace

Ejemplo ficticio:

```text
https://tu-api.onrender.com/api/auth/reset-password#token=JWT_DISTINTO
└────────── servidor ─────┘└──── ruta fija ──────┘└─ dato variable ─┘
```

requestRecovery obtiene la dirección desde PUBLIC_API_URL, busca la cuenta y llama
a createResetToken. Esa función crea un JWT firmado para esa cuenta. Un jti aleatorio
hace distintos los tokens de solicitudes separadas, incluso emitidas en el mismo segundo.
Después se agrega el token al fragmento de la URL, que empieza con #.

El backend envía a EmailJS reset_url (el enlace completo) y reset_token (el JWT).
La plantilla entregada para Gymbro utiliza un dominio y una ruta fijos, con
{{reset_token}} como parte variable. EmailJS sustituye esa variable al preparar el correo.
El dominio de la plantilla debe coincidir con la dirección configurada para la API.
EmailJS no decide quién puede cambiar contraseñas ni cuándo vence la autorización.

## 3. Qué contiene el JWT

| Campo | Significado |
|---|---|
| sub | ID de la cuenta |
| iat | Instante en que se emitió |
| exp | Instante a partir del cual deja de aceptarse |
| jti | Identificador aleatorio del enlace |
| iss | Emisor esperado: Gymbro |
| aud | Destino de uso: recuperación de contraseña |
| purpose | Propósito que también comprobamos explícitamente |

El contenido está codificado y firmado, no cifrado. Puede leerse si se decodifica,
pero no debe poder modificarse manteniendo una firma válida. No contiene la contraseña,
su hash bcrypt, JWT_SECRET ni la clave privada de EmailJS. El token completo sí es
una autorización temporal: quien lo posee puede intentar usarlo durante su vigencia.

## 4. Por qué dura 15 minutos y quién lo valida

En createResetToken el argumento interno predeterminado es expiresIn = '15m'.
La biblioteca jsonwebtoken calcula exp a partir de la emisión:

```text
15 minutos = 900 segundos
exp = iat + 900
```

Es una decisión del código de Gymbro, no una limitación del endpoint ni de EmailJS.
El usuario solo envía su correo: no elige ese plazo en la petición pública.
Si se genera a las 18:00, vence a las 18:15, aunque el correo llegue a las 18:03
o el formulario se abra a las 18:14. Abrirlo no reinicia el plazo.

Cuando se envía la contraseña nueva, resetPassword llama a verify. Esa función usa
jwt.verify, que comprueba la firma y compara exp con el reloj del servidor.
La implementación instalada está en node_modules/jsonwebtoken/verify.js:
si la hora actual es mayor o igual al vencimiento, genera TokenExpiredError.
Gymbro traduce ese fallo en una respuesta 400 con un mensaje para pedir otro enlace.

Cambiar el reloj del teléfono no cambia el reloj del servidor. Editar exp dentro
del token rompe la firma. Cambiar el texto de la plantilla o el JavaScript de la
página tampoco cambia la comprobación del backend.

## 5. Qué ocurre al abrir el correo

El navegador pide por GET la ruta fija. El fragmento #token=... no se envía
automáticamente en esa petición. El JavaScript del formulario lo lee, lo conserva
en memoria y lo retira de la dirección visible con history.replaceState.

Eso no consume el token. Al tocar Guardar, el script hace POST a la misma ruta,
enviando un JSON con token y password. El backend hace las comprobaciones reales.
La coincidencia entre contraseña y confirmación se comprueba en el formulario;
la longitud y el tamaño en bytes se vuelven a validar en el servidor.

## 6. Validaciones antes de cambiar la contraseña

1. La ruta valida el formato del JSON, la longitud de la contraseña y el límite de intentos.
2. jwt.decode lee el ID de cuenta. Todavía no verifica ni autoriza nada.
3. Se busca una cuenta activa y se obtiene su hash actual.
4. jwt.verify comprueba firma, vencimiento, algoritmo, emisor y destinatario.
5. También se comprueban el ID de cuenta y el propósito de recuperación.
6. bcrypt calcula un hash nuevo, sin guardar la contraseña original.
7. Una transacción bloquea la fila de la cuenta y vuelve a verificar el token con el hash actual.
8. Se guardan el nuevo hash y la fecha passwordChangedAt.
9. La API confirma el cambio. Después el usuario inicia sesión normalmente.

## 7. Cómo se evita usarlo dos veces

La clave de firma se deriva de JWT_SECRET y del hash bcrypt actual de la cuenta.
Cuando cambia ese hash, cambia la clave con la que se comprueban los enlaces.
Un token firmado con el hash anterior deja de verificar, aunque aún no hayan
transcurrido los 15 minutos. El bloqueo de fila impide que dos solicitudes simultáneas
lo consuman correctamente dos veces.

No se guarda una marca de usado por cada jti. El uso único lo da el cambio de hash
y la comprobación dentro de la transacción. Si se pidieron varios enlaces antes
del cambio, todos dejan de servir cuando uno completa correctamente el proceso.
Esto también sucede si se elige la misma contraseña: bcrypt genera un hash nuevo con otra sal.

## 8. Otros plazos y valores del código

| Valor | Función |
|---|---|
| expiresIn: 15m | Vigencia firmada del enlace |
| expires_minutes: 15 | Dato informativo para la plantilla de correo |
| AbortSignal.timeout(15000) | Espera de 15 segundos para la petición a EmailJS |
| timeout(75000) | Espera de 75 segundos de una petición de la app |
| Ventanas de 15 minutos en los limitadores | Control de solicitudes e intentos, separado del vencimiento |
| passwordChangedAt | Revocación de sesiones antiguas, no cálculo del vencimiento del enlace |
| expiresIn: 7d en credentials.js | Vigencia del JWT de sesión, distinto del de recuperación |
| nonce del HTML | Permite ejecutar el script autorizado por CSP; no es el token del correo |

No hace falta un temporizador, cron ni proceso que borre enlaces al vencer.
Cada intento se compara con la hora actual. Reiniciar el servidor no reinicia el
vencimiento firmado si conserva su secreto y la cuenta mantiene el mismo hash.

## Archivos para estudiar en orden

1. frontend/src/app/components/forgot-password.component.ts: formulario y estados de Angular.
2. frontend/src/app/services/auth.service.ts: método forgotPassword que envía el correo a la API.
3. backend/src/routes/password-recovery.js: los tres endpoints HTTP.
4. backend/src/services/password-recovery.js: creación, firma, validación, envío y consumo del token.
5. backend/src/views/password-reset.js: HTML y JavaScript que reciben el enlace y envían la nueva contraseña.
6. backend/src/services/credentials.js: invalidación de sesiones después del cambio.

Este documento explica el diseño. Para activar la entrega real y aplicar la migración,
ver RECUPERAR-CONTRASENA.md. Durante este trabajo solo se documentó y ordenó el código;
no se configuró EmailJS, no se enviaron correos ni se modificó una base real.
