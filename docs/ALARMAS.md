# Alarmas de entrenamiento

En Perfil → Mis alarmas se pueden activar o desactivar por separado el recordatorio de entrenamiento (15 minutos antes), el fin de serie y el fin de descanso. El botón Probar sonido permite comprobar el volumen. Las preferencias se guardan en este dispositivo por cuenta y servidor.

Los recordatorios usan el día y la hora inicial de cada asignación semanal. Si empieza un lunes a las 00:05, el aviso se programa el domingo a las 23:50. Al cambiar o eliminar una asignación se actualizan los avisos; cerrar sesión cancela los pendientes de esa cuenta. Los horarios siguen la zona horaria local del teléfono.

Los temporizadores se programan al iniciar la fase. Pausar cancela el aviso pendiente; reanudar, reiniciar o cambiar la duración lo vuelve a programar. El aviso de serie no completa ni guarda la serie: el usuario sigue usando Terminar serie. El descanso conserva su comportamiento de finalización automática.

## Android

Es necesario instalar el APK actualizado, permitir las notificaciones y, cuando corresponda, habilitar los avisos exactos desde Mis alarmas. Cada tipo tiene un sonido diferente y su propio canal del sistema. El modo silencio, No molestar, volumen y ajustes de batería pueden afectar su entrega.

Las notificaciones quedan programadas en Android aunque se cambie de pestaña o se lleve la app al fondo. No se garantiza precisión con el teléfono suspendido: Android limita los avisos `allowWhileIdle` a uno cada nueve minutos por aplicación durante Doze. Por eso los temporizadores cortos deben usarse con la app activa para mayor precisión. Forzar la detención de la app también puede impedir avisos hasta volver a abrirla. Referencia: https://capacitorjs.com/docs/apis/local-notifications

## Navegador

El sonido requiere una interacción inicial (Activar avisos, Probar sonido o iniciar una serie). La página debe permanecer abierta; el navegador puede suspenderla en segundo plano. No se promete una alarma con el navegador cerrado. Al regresar de una suspensión no se reproducen recordatorios semanales de hace horas.

## Verificación

`npm run test:alarms` comprueba cálculo de horarios, cruce de semana, programación, cancelación por pausa o eliminación, recuperación, cierre de sesión y sonido único por fase con APIs simuladas. La compilación de Android verifica la integración nativa; la entrega real con pantalla bloqueada debe comprobarse en el teléfono elegido.

El plugin Android requiere JDK 21. El compilador busca primero la instalación local en `.android-tools/jdk21/` si no está definido `JAVA_HOME`; esa carpeta de herramientas no se sube al repositorio. Para otros equipos, instalar JDK 21 y configurar `JAVA_HOME` antes de ejecutar `npm run android:apk`.
