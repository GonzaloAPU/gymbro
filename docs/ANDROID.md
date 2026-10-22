# Gymbro Android

La aplicación reutiliza Angular dentro de Capacitor 8. Sus archivos se instalan en el teléfono: no abre una web alojada remotamente. Identificador inicial: `com.smartgymbro.app`. Android mínimo: 7 (API 24); objetivo: Android 16 (API 36).

## APK 0.3.1 con servidor preconfigurado y privacidad

Incluye `https://gymbro-api-t7mg.onrender.com` como servidor predeterminado y ya no
requiere configurar la conexión en la primera apertura. La actualización migra una
vez las instalaciones anteriores al servidor público. Si antes usaban otro servidor,
se retiran su token y perfil locales; los respaldos de entrenamientos no se borran
y siguen separados por servidor/cuenta. Una sesión de Render ya configurada se conserva.
La pantalla Conexión sigue disponible para diagnóstico; después de cerrar sesión
permite cambiar manualmente de servidor. El navegador conserva el proxy de desarrollo.
Versión Android: `0.3.1`, código `3`. Incluye términos, privacidad y consentimientos separados.
Antes de instalarla sobre el servicio publicado, seguir el orden SQL → Render → APK de
[privacidad](PRIVACIDAD.md). El APK directo conserva la firma debug de pruebas;
una publicación en Play Store requiere preparar la firma de distribución.

## Preparar el APK

Requisitos: Node 22 o superior, JDK 21, Android SDK 36 y Build Tools 36.0.0. El plugin de alarmas necesita específicamente la toolchain Java 21. Android Studio permite instalar el SDK y aceptar sus licencias. No se acepta ninguna licencia automáticamente desde los comandos del proyecto.

Desde la raíz:

```powershell
npm.cmd ci
npm.cmd run android:apk
```

El archivo se genera en `frontend/android/app/build/outputs/apk/debug/app-debug.apk`. Es una versión de pruebas con firma debug, no una publicación de Play Store. Para abrir el proyecto en Android Studio: `npm.cmd run android:open`. Después de cambiar Angular, `npm.cmd run android:sync` reconstruye la interfaz y la copia a Android.

El compilador busca `ANDROID_HOME`, `ANDROID_SDK_ROOT`, el SDK habitual de Windows o `.android-tools/sdk` dentro del proyecto. Si `JAVA_HOME` no está configurado, prioriza `.android-tools/jdk21/` y luego busca instalaciones compatibles en `.jdks`. Las herramientas y archivos locales quedan fuera de Git.

## Probar con tu PC

1. Iniciar PostgreSQL y el backend como hasta ahora: `docker compose up -d` y `npm.cmd run dev:backend`.
2. Instalar el APK en el teléfono y conectarlo al mismo Wi-Fi que la PC.
3. Para cambiar el servidor de producción por uno local, abrir Conexión desde el ingreso e indicar `http://IP-DE-TU-PC:3000`. Podés encontrar la IPv4 del adaptador Wi-Fi con `ipconfig`. En un emulador Android de esa PC, usar `http://10.0.2.2:3000`.
4. Comprobar la conexión e ingresar con una cuenta existente. Si Windows bloquea el acceso, permitir únicamente el puerto 3000 en la red privada para las pruebas. No abrir PostgreSQL a Internet.

`localhost` en el teléfono significa el propio teléfono. La dirección configurada es la del backend Express, nunca la de Firebase ni la de PostgreSQL. Se puede volver a cambiar desde «Configurar conexión al servidor» en el ingreso; cerrar sesión antes de cambiarla evita enviar credenciales a otro servidor.

HTTP está permitido únicamente en el APK debug para la red de pruebas. La variante release exige HTTPS. La dirección HTTPS de Render ya está preconfigurada. La app no contiene contraseñas de la base ni claves administrativas.

## Cambios de experiencia

- Inicio prioriza «Voy a entrenar» y ofrece «Crear una rutina» como alternativa.
- Crear rutina tiene tres pasos: nombre, selección y configuración de ejercicios, y revisión antes de guardar. Al guardar vuelve a la biblioteca para asignar los días.
- Entrenar destaca la siguiente serie y el descanso actual. Los controles están junto a cada reloj. «Editar serie» contiene peso, repeticiones y tiempos; «Terminar serie» registra sus datos.
- En la tarjeta de entrenamiento se puede elegir el ejercicio y encadenar de 2 a 4 ejercicios en el orden seleccionado. Se registra una serie de cada ejercicio y el descanso comienza al cerrar la ronda. Cada ejercicio requiere tocar Iniciar; los que completaron todas sus series se omiten. El grupo se configura para el entrenamiento actual y cada serie se guarda individualmente en el backend.
- Barra inferior con Inicio, Entrenar, Progreso y Perfil; indicadores activos y controles táctiles.
- Márgenes para las áreas seguras del teléfono y formularios con tamaño de texto adecuado.
- Ícono de pesa y pantalla de arranque con los colores de Gymbro.
- El botón Atrás vuelve al inicio; desde el inicio minimiza la app. Cambiar de pestaña conserva la instancia del entrenamiento.
- Los relojes calculan el tiempo mediante marcas reales: al volver de segundo plano recuperan el tiempo transcurrido, aunque Android haya suspendido los intervalos. Un cambio manual del reloj del teléfono puede alterar esa medición.

La API sigue siendo necesaria para ingresar y cargar datos nuevos. Un entrenamiento ya cargado conserva su estado local y una cola de operaciones durante cortes de conexión; consulta [recuperación y sincronización](ENTRENAMIENTO-OFFLINE.md). Los avisos de entrenamiento, serie y descanso usan notificaciones locales con las limitaciones de Android descritas en [alarmas](ALARMAS.md). Probar los relojes, las notificaciones con pantalla bloqueada, el selector de fotos y el teclado en un dispositivo real antes de distribuirla al equipo.

Las comprobaciones de lógica del recorrido se ejecutan juntas con `npm run test:frontend`. Simulan los servicios: no crean rutinas ni sesiones en la base real. `npm run typecheck` comprueba también declaraciones e importaciones sin uso.

## Archivos para estudiar

- `frontend/capacitor.config.ts`: identifica la app y el directorio del bundle.
- `frontend/src/app/mobile.ts`: arranque nativo y botón Atrás.
- `frontend/src/app/services/api-endpoint.service.ts`: dirección del backend.
- `frontend/src/app/interceptors/auth.interceptor.ts`: reescribe las rutas propias y agrega su token.
- `frontend/src/app/components/connection.component.ts`: configuración y prueba de conexión.
- `frontend/android/`: proyecto Android versionado; no editar las copias generadas de Angular dentro de assets.

Referencias oficiales: [Capacitor](https://capacitorjs.com/docs/getting-started), [entorno Android](https://capacitorjs.com/docs/getting-started/environment-setup), [compatibilidad Java de Gradle](https://docs.gradle.org/current/userguide/compatibility.html).
