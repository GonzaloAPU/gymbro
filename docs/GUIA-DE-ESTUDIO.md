# Guía para estudiar Gymbro

Esta guía acompaña los comentarios en español del código de la rama
`codex/firebase-sql-prototype`. Los comentarios describen el comportamiento actual.
La aplicación principal continúa usando Angular, Express, Sequelize y PostgreSQL;
Firebase SQL Connect es una prueba local independiente.

## 1. Cómo funciona una acción de principio a fin

Ejemplo: asignar una rutina al lunes de 18:00 a 19:00.

1. El usuario abre el formulario en `frontend/src/app/components/dashboard.component.ts`.
2. `addSlot` valida el horario y lo agrega a `draftSchedule`, un borrador en memoria.
3. `saveSchedule` llama a `RoutineService.assignSchedule`.
4. `routine.service.ts` envía una petición HTTP PUT a `/api/routines/.../schedule`.
5. `auth.interceptor.ts` agrega el token de la cuenta a la cabecera Authorization.
6. El proxy de desarrollo reenvía `/api` desde Angular al backend.
7. Express recibe la solicitud en `backend/src/app.js` y la dirige a `routes/routines.js`.
8. `requireAuth` verifica el token. Zod valida la forma de los datos.
9. Una transacción comprueba propietario, descansos y horarios de otras rutinas.
10. Sequelize reemplaza las filas correspondientes en `routine_schedules`.
11. La API responde y el componente actualiza sus signals: cambian plan y calendario.

El borrador es temporal; las filas de PostgreSQL permiten cerrar sesión y recuperar
las asignaciones después. `localStorage` y una tabla de base de datos son mecanismos
distintos: no hay que confundir guardar en el navegador con guardar en el servidor.

## 2. Orden recomendado de lectura

| Paso | Archivo o carpeta | Qué aprender |
| --- | --- | --- |
| 1 | `package.json` | Comandos y organización de los dos workspaces |
| 2 | `frontend/src/main.ts` | Arranque e inyección de servicios de Angular |
| 3 | `frontend/src/app/app.routes.ts` | Cómo una URL elige la pantalla |
| 4 | `frontend/src/app/app.component.ts` | Navegación y conservación de Entrenar |
| 5 | `frontend/src/app/services/` | Contratos de datos y peticiones HTTP |
| 6 | `frontend/src/app/components/login.component.ts` | Formulario y autenticación |
| 7 | `backend/src/server.js` y `app.js` | Arranque y conexión de rutas HTTP |
| 8 | `backend/src/routes/auth.js` | Validación, hash de contraseña y token |
| 9 | `backend/src/models/index.js` | Tablas y relaciones |
| 10 | `backend/src/routes/routines.js` y `schedule.js` | Persistencia y reglas del calendario |
| 11 | `dashboard.component.ts` y `routine-builder.component.ts` | Construcción del plan y biblioteca |
| 12 | `workout.component.ts` y `backend/src/routes/sessions.js` | Relojes y registro del entrenamiento |
| 13 | `progress.component.ts` y `backend/src/routes/progress.js` | Resúmenes, totales y ranking SQL |
| 14 | `backend/test/`, archivos `.spec.ts` y `tools/verify-*.cjs` | Diferencias entre pruebas y simulaciones |
| 15 | `dataconnect/` y `tools/firebase-smoke.mjs` | Experimento separado con SQL Connect |

Las rutas de esta guía son relativas a la raíz del repositorio. En el editor se
pueden buscar con Ctrl+P. Un buen ejercicio es seguir una función desde el evento
de su botón hasta la ruta HTTP que guarda sus datos.

## 3. Vocabulario que aparece en el código

| Expresión | Explicación breve |
| --- | --- |
| `import` / `export` | Importar funciones o tipos de otro archivo / permitir que otros los usen |
| `const` / `let` | Referencia que no se reasigna / variable que sí se puede reasignar |
| `async` / `await` | Esperar una operación asíncrona sin bloquear todo el proceso |
| `try` / `catch` / `finally` | Intentar algo, manejar el fallo y liberar recursos al terminar |
| `?.` | Leer solo si el objeto existe; de lo contrario devuelve undefined |
| `??` | Usar un valor alternativo cuando el primero es null o undefined |
| `...objeto` | Copiar campos; los campos siguientes pueden reemplazar valores |
| `map` | Transformar cada elemento de una lista |
| `filter` | Conservar elementos que cumplen una condición |
| `flatMap` | Transformar y unir listas en un solo nivel |
| `reduce` | Acumular un resultado, como sumar el volumen de todas las series |
| `Set` | Colección sin duplicados: útil para las series completadas |
| `Map` | Diccionario de claves y valores: útil para recordar IDs por ejercicio |
| `interface` | Contrato de TypeScript; desaparece al compilar, no valida datos externos |
| `private` / `readonly` | Restringir uso desde la clase / impedir reasignar la propiedad en TypeScript |

`readonly` no vuelve inmutable todo lo que contiene un objeto: una signal readonly
como propiedad puede actualizar su valor con `.set()`.

## 4. Angular: pantalla, estado y servidor

Cada componente tiene tres partes: `template` es HTML con instrucciones Angular,
`styles` define su apariencia y la clase contiene datos y acciones.

- `{{ name }}` muestra un valor.
- `[disabled]="saving()"` enlaza una propiedad del elemento con el estado.
- `(click)="save()"` ejecuta un método cuando sucede un evento.
- `#email` permite referirse al input desde la plantilla.
- `@if` decide si se muestra un bloque; `@for` repite elementos y `track` les da identidad.
- `signal(0)` guarda un valor reactivo. `estado()` lee, `.set(valor)` reemplaza y
  `.update(anterior => nuevo)` calcula el siguiente valor.
- `computed` deriva valores de otras signals. `effect` ejecuta una reacción cuando
  cambian las signals leídas dentro de él.
- `inject(AuthService)` obtiene el servicio compartido registrado en Angular.

HttpClient devuelve Observables. En las llamadas actuales, `.subscribe()` dispara
la petición y recibe `next` o `error`. `pipe` combina operadores: `tap` realiza
efectos como guardar la sesión, `map` transforma respuestas, `switchMap` encadena
una nueva operación y `finalize` libera el indicador de espera al terminar.

`ngOnInit` se ejecuta al inicializar el componente; `ngOnChanges` recibe cambios de
sus inputs y `ngOnDestroy` libera recursos cuando se destruye.

## 5. Entrenar: los tres tiempos

| Tiempo | Estado principal | Qué lo modifica |
| --- | --- | --- |
| Total de sesión | `accumulatedMs`, `runningSince`, `elapsedMilliseconds` | Play, Pause y Stop del reloj superior |
| Serie en curso | `phaseMs`, `phaseSince`, `phaseMilliseconds` con `phase='work'` | Play, Pause, Reiniciar serie y Stop de la serie |
| Descanso | Las mismas variables de fase con `phase='rest'` | Guardado exitoso de una serie y fin del descanso |

`performance.now()` mide el tiempo transcurrido desde una referencia del navegador.
`setInterval(..., 16)` pide refrescar la imagen aproximadamente cada 16 ms; no
garantiza esa frecuencia ni precisión de un milisegundo. El cálculo usa diferencias
de tiempo para evitar sumar errores si un refresco llega tarde.

La secuencia habitual es `idle → work → guardar serie → rest → idle`. La serie
solo pasa a descanso cuando el servidor confirma el guardado. La duración de
trabajo configurada sirve de referencia; alcanzar ese valor no completa la serie.

Stop del reloj superior llama a `pause()` y conserva la sesión. `completeSet()`
guarda una serie. `finishSession()` es la operación explícita que completa la sesión.
Volver a una serie conserva su clave para enviar PUT y reemplazarla, evitando
duplicar el volumen con un segundo POST.

`AppComponent` mantiene montado `WorkoutComponent` y cambia su visibilidad al
navegar dentro de la web. Esto conserva relojes en memoria, pero no restaura todo
el entrenamiento después de recargar la página, cerrar el navegador o cerrar sesión.

## 6. Modelo de datos

| Modelo | Guarda |
| --- | --- |
| User | Perfil, hash de contraseña, gimnasio, disciplina, foto y descansos |
| Exercise | Catálogo reutilizable de ejercicios |
| Routine | Contenedor de una rutina del usuario |
| RoutineDay | Bloque de ejercicios; el editor actual crea uno por rutina |
| RoutineExercise | Objetivos previstos de un ejercicio dentro de un bloque |
| RoutineSchedule | Día y horario asignados; múltiples filas permiten repetir la rutina |
| TrainingSession | Un entrenamiento ejecutado y sus totales |
| PerformedExercise | Un ejercicio realizado dentro de esa sesión |
| PerformedSet | Una serie con su carga y repeticiones reales |
| BodyWeightHistory | Mediciones de peso corporal a lo largo del tiempo |
| StrengthRecord | Marcas almacenadas con estimación de una repetición máxima |

`UUID` es un identificador. Una clave foránea enlaza una fila con otra tabla.
`hasMany` expresa uno a muchos; `belongsTo` declara el propietario. `as` es el
alias utilizado por los `include` para cargar relaciones. Un índice único impide
duplicados en una columna o combinación de columnas.

Una transacción confirma todos sus cambios juntos o los revierte si hay un error.
El bloqueo de la fila User coordina cambios de horarios y descansos para que dos
solicitudes simultáneas no validen sobre un estado desactualizado.

Sequelize convierte los nombres camelCase en columnas snake_case mediante
`underscored`. Algunos valores DECIMAL pueden llegar de PostgreSQL como texto:
por eso los cálculos utilizan `Number(...)`.

`RoutineDay.dayNumber` es un orden interno; no equivale al lunes o jueves. Los
horarios vigentes vienen de `RoutineSchedule`; su JSON antiguo se conserva por
compatibilidad y se vacía al migrar. `Routine.active` tampoco sustituye el calendario.

## 7. Autenticación y validaciones

La contraseña se transforma en un hash con bcrypt. Al ingresar se compara con el
hash; nunca se devuelve al frontend. La API firma un JWT con `sub` (ID del usuario)
y vencimiento. El navegador lo conserva y el interceptor lo manda como Bearer.

El guard de Angular controla navegación; `requireAuth` verifica el token en el
servidor. Las consultas con `userId` controlan a quién pertenece el dato. Son
responsabilidades diferentes. Un token presente en localStorage no demuestra
por sí solo que todavía sea válido.

Zod valida datos recibidos en ejecución. `.optional()` permite omitir un campo;
`.nullable()` permite enviar null para vaciarlo. La validación del componente ayuda
al usuario, pero la API vuelve a validar antes de escribir.

HTTP 200 indica éxito; 201 creación; 400 datos inválidos; 401 autenticación fallida;
404 registro no encontrado; 409 conflicto y 500 fallo interno.

## 8. Fotos, progreso y ranking

`profile-photo.ts` detecta firmas JPEG/PNG, abre la imagen, la dibuja en canvas y
reduce calidad y dimensiones. Devuelve una URL de datos JPEG Base64; actualmente
se almacena en `User.photoUrl`, no en una carpeta de fotos ni en Firebase Storage.
`URL.revokeObjectURL` libera la referencia temporal usada para abrir la imagen.

El resumen limita las listas recientes, pero calcula calorías y cantidad total de
sesiones con consultas independientes. Las calorías son una estimación fija por
minuto de entrenamiento. No provienen de un sensor ni de un modelo personalizado.

El ranking usa series de sesiones COMPLETED. Una consulta SQL selecciona la mejor
serie por persona y ejercicio; ante igual peso personal prioriza repeticiones y
fecha. `dense_rank` comparte la posición entre usuarios que empatan en peso.
Peso muerto rumano y convencional se muestran por separado. La clasificación
reconoce una lista concreta de nombres, no todas las variantes posibles.

En Progreso la curva y algunos indicadores de la plantilla siguen siendo
ilustrativos; no hay que interpretarlos como una serie calculada del historial.

## 9. Configuraciones que no admiten comentarios JSON

Se documentan aquí para conservar archivos válidos.

| Archivo | Función |
| --- | --- |
| `package.json` raíz | Workspaces, scripts y herramientas comunes |
| `backend/package.json` | Dependencias Express, Sequelize y scripts del servidor |
| `frontend/package.json` | Dependencias Angular y comandos de desarrollo/compilación |
| `package-lock.json` | Versiones exactas y árbol de dependencias; generado por npm |
| `frontend/angular.json` | Configuración de build y servidor de desarrollo de Angular |
| `frontend/tsconfig.json` | Reglas del compilador TypeScript |
| `frontend/tsconfig.app.json` | Configuración específica para compilar la aplicación |
| `frontend/proxy.conf.json` | Reenvío de `/api` al backend durante el desarrollo |
| `firebase.json` | Emulador SQL Connect local en 9399 y PostgreSQL interno en 55432 |
| `.firebaserc` | Proyecto ficticio `demo-gymbro-local` usado por la CLI |

Los `.env.example` muestran qué variables configurar; `.env` contiene los valores
locales que no se suben a Git. `.gitignore` excluye dependencias, archivos compilados,
respaldos, datos del emulador y configuración privada.

El ejemplo `.env` de la raíz enumera valores PostgreSQL de referencia, pero Compose
actualmente fija sus credenciales y puerto directamente. Las variables de pgAdmin
sí se interpolan. Cambiar solo POSTGRES_PORT en un `.env` no cambia el puerto publicado.

`docker-compose.yml` levanta PostgreSQL y pgAdmin. `5433:5432` publica en Windows
el puerto 5433 de un servicio que escucha en 5432 dentro del contenedor. Desde
Windows se usa localhost:5433; entre contenedores, postgres:5432. Los volúmenes
nombrados conservan los datos al recrear contenedores.

## 10. Scripts y pruebas

| Comando o archivo | Efecto |
| --- | --- |
| `npm run dev` | Inicia backend y frontend juntos |
| `npm run build` | Comprueba la entrada del backend y compila Angular |
| `npm test` | Ejecuta las siete pruebas actuales del backend con node:test |
| `npm run db:migrate` | Modifica la estructura de la base y migra horarios antiguos |
| `npm run db:seed` | Carga datos demo; no es un comando de consulta |
| `backend/scripts/seed-accounts.js` | Genera los cinco perfiles y sus historiales ficticios |
| `backend/scripts/verify-schedule-persistence.js` | Guarda, consulta y restaura horarios de prueba contra la API/base |
| `tools/verify-*.cjs` | Verificaciones locales con TypeScript y dependencias simuladas |
| `tools/update_presentation_stack.js` | Edición histórica de texto dentro de una presentación PPTX |

Las pruebas del backend sustituyen métodos de modelos cuando corresponde y abren
servidores HTTP temporales. `assert` expresa qué resultado se espera; `t.after`
restaura dependencias y cierra recursos. Los `.spec.ts` de los servicios Angular
solo prueban su creación con HttpClientTesting; no son una cobertura completa.

## 11. Firebase local

`dataconnect/schema/schema.gql` define tablas de prueba con GraphQL. `@table`
crea una entidad; el signo `!` exige un valor. Los campos de tipo Routine o Exercise
crean relaciones. SQL Connect genera entradas y operaciones a partir del esquema.

`dataconnect/prototype/operations.gql` declara consultas del conector. `NO_ACCESS`
cierra su uso habitual desde clientes; la prueba utiliza el endpoint administrativo
del emulador, que debe mantenerse local. No representa permisos terminados para
usuarios, coaches ni gimnasios.

`npm run firebase:emulators` inicia el entorno demo con importación/exportación
local. En otra terminal, `npm run firebase:test` prueba escritura, relaciones y
lectura, y elimina sus datos. No ejecuta una migración de las cuentas de Gymbro.

Los archivos de `dataconnect/.dataconnect`, `.firebase`, `node_modules` y `dist`
son generados por herramientas: no se comentan manualmente. El detalle de arranque
está en [FIREBASE-PROTOTYPE.md](FIREBASE-PROTOTYPE.md).
