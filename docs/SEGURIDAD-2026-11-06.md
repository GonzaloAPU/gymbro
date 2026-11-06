# Revisión de seguridad — 6 de noviembre de 2026

Estos cambios están preparados en la rama web. No están activos en Render hasta desplegar el backend. No constituyen una garantía frente a todos los ataques.

## Protección de la API

- Hasta 10 solicitudes por IP en una ventana móvil de 60 segundos. La petición 11 bloquea durante 60 segundos y devuelve 429 con Retry-After. Las peticiones bloqueadas no prolongan el bloqueo. Se exceptúan OPTIONS y GET /api/health.
- Los contadores de producción persisten en PostgreSQL y se comparten entre instancias. Las IP se identifican mediante HMAC; no se guardan sus direcciones. IPv6 se agrupa por /56 para impedir eludir el límite rotando direcciones cercanas.
- Hay un límite de comprobaciones simultáneas y de claves almacenadas. Si el almacenamiento de protección falla, se rechaza la operación con 503.
- TRUST_PROXY_HOPS=1 está previsto para Render. Hay que comprobar la topología real antes de cambiarlo: confiar en proxies de más puede permitir falsificar la IP. En desarrollo directo se usa 0.
- Helmet añade cabeceras de seguridad. Los formularios de autenticación admiten hasta 8 KB; el límite general de 1 MB conserva la carga de fotos. Las contraseñas se limitan a 72 bytes UTF-8 para evitar el truncamiento de bcrypt.
- El almacenamiento de seguridad utiliza hasta dos conexiones adicionales a las del ORM.

Una IP compartida por usuarios de un gimnasio también comparte el límite de 10 solicitudes. Puede pausar el uso legítimo. La cola local conserva los entrenamientos ante 429 y espera antes de reintentar. Estos controles no sustituyen la protección de infraestructura contra ataques distribuidos.

## Gemini y consumo

Se mantiene el cupo existente de tres generaciones exitosas por usuario y semana. Además, se reservan globalmente hasta 20 intentos diarios y 100 mensuales, con periodos UTC y contadores persistentes. Los errores y tiempos de espera consumen este presupuesto global porque Google podría haber procesado la solicitud.

La integración exige GEMINI_ENABLED=true y GEMINI_BUDGET_CONFIRMED=true. Usa por defecto gemini-3.5-flash-lite y conserva compatibilidad con gemini-2.5-flash y gemini-2.5-flash-lite. No cambia automáticamente de modelo ni reintenta llamadas. Limita la entrada a 48.000 bytes y la salida a 4.096 tokens, una respuesta y sin herramientas de búsqueda. En 3.5 configura thinking mínimo y omite la temperatura personalizada; en 2.5 desactiva thinking.

El titular confirmó que el proyecto sigue gratuito y sin facturación. Para conservar ese esquema, no vincular una cuenta de facturación. La aplicación no puede comprobar el estado de facturación ni impedir llamadas hechas fuera de ella con una clave robada. Mantener la clave exclusivamente en el backend y restringirla al servicio de Gemini. Nunca incluirla en GitHub Pages ni en el APK.

Los límites propios reducen consumo; no garantizan cero cargos si posteriormente se activa facturación. Los controles del proveedor pueden tener retrasos: [documentación de Google](https://blog.google/innovation-and-ai/technology/developers-tools/more-control-over-gemini-api-costs/).

## Web

La compilación web incluye CSP que restringe scripts al propio sitio, conexiones a la API configurada y bloquea objetos y marcos. Se desactivó la inserción de CSS crítico que generaba manejadores incompatibles con esa política. No se permite unsafe-eval ni unsafe-inline en scripts.

GitHub Pages no permite configurar todas las cabeceras HTTP: una CSP mediante meta no proporciona frame-ancestors. Para ese control adicional se necesita un alojamiento con cabeceras configurables. La política reduce el riesgo de XSS, pero no elimina la necesidad de revisar el código.

## Orden de despliegue

1. Respaldar la base existente.
2. Ejecutar únicamente backend/sql/supabase/09-seguridad.sql en Supabase con un administrador. No volver a ejecutar el esquema inicial. Añade controles_seguridad como tabla técnica y sus permisos, sin borrar datos deportivos.
3. Configurar Render con SECURITY_STORE=postgres y TRUST_PROXY_HOPS=1, conservando las credenciales, el idioma del esquema y la validación TLS actuales.
4. Para habilitar Gemini tras confirmar el nivel gratuito y las restricciones de la clave: GEMINI_BUDGET_CONFIRMED=true, GEMINI_ENABLED=true, un modelo permitido y los topes diarios/mensuales indicados.
5. Llevar los cambios del backend a la rama que despliega Render antes de publicar la web. El servidor nuevo no inicia en producción si falta la tabla de seguridad.
6. Verificar inicio de sesión, registro de entrenamiento, sincronización y generación de planes. No realizar pruebas masivas sobre producción.

## Validación

La auditoría de dependencias pasó de 11 avisos (uno crítico) a cero avisos reportados al actualizar las dependencias. Esto no demuestra ausencia de vulnerabilidades futuras.

Las pruebas cubren la petición 11, concurrencia, reinicio del limitador, cabeceras IP falsas, agrupación IPv6, fallos de almacenamiento, presupuestos diarios/mensuales, ausencia de reintentos a Google y permisos SQL. Usan respuestas simuladas de Gemini, sin consumir la API real. El script opcional test:security:postgres requiere Docker para comprobar dos instancias contra PostgreSQL real.

Resultado local: 450 pruebas aprobadas (243 backend, 173 frontend y 34 SQL), comprobación de tipos y compilaciones estándar y web correctas. También pasó el verificador de recuperación y espera tras 429. La prueba adicional contra PostgreSQL real no pudo iniciarse porque Docker no estaba disponible; queda pendiente. No se ejecutaron ataques sobre producción ni llamadas reales a Google.
