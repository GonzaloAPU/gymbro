# Cupo semanal de IA

La protección global incorporada el 06/11/2026 agrega 20 intentos diarios y 100 mensuales para toda la aplicación. Estos intentos incluyen errores del proveedor y se conservan aunque se revierta el cupo semanal del usuario. Requiere la migración 09 y la configuración descrita en [la revisión de seguridad](SEGURIDAD-2026-11-06.md).

Cada cuenta dispone de 3 generaciones correctas de una semana completa de rutinas por semana calendario. El período comienza los lunes a las 00:00 de Argentina (UTC-3). No hay acumulación. Generar otra propuesta consume un uso aunque luego no se acepte. Aceptar, volver a abrir y generar planes locales no consumen usos.

El contador y el inicio de semana se guardan en users. La API bloquea la fila de la cuenta durante la comprobación, generación y guardado dentro de una transacción: solicitudes desde distintos procesos no pueden superar el cupo. Si falla Gemini, la validación o el guardado, se revierte el consumo. Se mantiene además el límite breve contra solicitudes repetidas. El frontend informa los usos restantes; la protección real está en el backend.

Antes de desplegar: ejecutar backend/sql/supabase/07-ai-weekly-quota.sql en Supabase. Después desplegar backend y frontend. El instalador para bases nuevas y el comando de migraciones también incluyen estos campos. No ejecutar el instalador 01 sobre la base existente.

Este cambio no habilita cobros ni una suscripción Premium. No se debe ofrecer una compra hasta disponer de pagos y de la validación del estado de suscripción en el servidor.
