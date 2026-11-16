<div align="center">

# Principia

**Simulaciones físicas para aprender haciendo.**

Elegí un fenómeno, ingresá sus parámetros y explorá su comportamiento sin
necesidad de programar.

</div>

Principia busca ayudar a estudiantes de Física 1 a visualizar ejercicios,
similar a cómo herramientas como GeoGebra apoyan el aprendizaje de matemática.
Los usuarios pueden crear simulaciones, mostrarlas en su perfil, publicarlas en
foros, comentarlas y guardarlas en favoritos. Las simulaciones públicas también
pueden consultarse desde el perfil de su dueño.

## Demostración

<p align="center">
  <img src="frontend/src/assets/principia%20demo.gif" alt="Demostración de una simulación de tiro oblicuo en Principia" width="520" />
</p>

### Contenido

- [Demostración](#demostración)
- [Frontend](#frontend)
- [Backend](#backend)
- [Autenticación y protección de datos](#autenticación-y-protección-de-datos)
- [Buenas prácticas de seguridad](#buenas-prácticas-de-seguridad)
- [Simulaciones y comunidad](#simulaciones-y-comunidad)

## Frontend

La interfaz es una aplicación de una sola página (SPA) desarrollada con
**Angular 22** y **TypeScript**. Implementa el registro e inicio de sesión,
perfiles, simulaciones y espacios comunitarios con foros, publicaciones y
comentarios.

### Funcionalidades

- Registro e inicio de sesión; las pantallas privadas requieren autenticación.
- Inicio con búsqueda, foros sugeridos y foros a los que pertenece el usuario.
- Creación y administración de foros, publicaciones y comentarios.
- Creación, edición, eliminación y consulta de simulaciones propias.
- Configuración de visibilidad de simulaciones (pública, privada u oculta) y
  opción para permitir su clonación.
- Perfiles personales y de otros usuarios, edición de datos y foto de perfil.
- Lista de simulaciones favoritas y acceso a la publicación correspondiente.
- Visualización y controles de las simulaciones compatibles.

### Fenómenos implementados

El formulario obtiene del backend la lista de fenómenos disponibles, pero el
frontend necesita un adaptador de parámetros y un motor para configurar y
ejecutar cada uno. Actualmente está implementado **Oblique Projectile Motion
(tiro oblicuo)**, con velocidad inicial, ángulo y altura inicial. La simulación
se ejecuta en el navegador mediante WebAssembly y muestra el tiempo y las
posiciones horizontal y vertical. Los demás fenómenos todavía no cuentan con
un adaptador y un motor de frontend.

### Rutas principales

| Ruta | Acceso | Pantalla o flujo |
| --- | --- | --- |
| `/` | Público | Presentación |
| `/login` | Público | Inicio de sesión |
| `/registro` | Público | Registro |
| `/inicio` | Requiere sesión | Inicio y exploración de foros |
| `/perfil` | Requiere sesión | Perfil, simulaciones y favoritos propios |
| `/perfil/:id` | Requiere sesión | Perfil de otro usuario |
| `/foros/crear` | Requiere sesión | Crear un foro |
| `/forums/:id` | Requiere sesión | Feed de publicaciones de un foro |
| `/simulaciones/crear` | Requiere sesión | Crear una simulación |
| `/simulaciones/mis` | Requiere sesión | Consultar simulaciones propias |
| `/forums/:forumId/publications/crear` | Requiere sesión | Iniciar la publicación en un foro |
| `/forums/:forumId/publications/crear/seleccionar` | Requiere sesión | Elegir una simulación existente |
| `/forums/:forumId/publications/crear/:simulationId` | Requiere sesión | Publicar una simulación en el foro |

Las rutas no reconocidas vuelven a la pantalla de presentación. Las rutas
marcadas como privadas usan una guarda de autenticación; si no hay sesión, se
redirige al inicio de sesión conservando la ruta solicitada.

### Estructura e integración

- `frontend/src/app/components/`: pantallas y componentes de interfaz,
  agrupados por funcionalidad.
- `frontend/src/app/services/`: acceso a la API, autenticación, interceptores,
  manejo de errores y notificaciones.
- `frontend/src/app/motor_interface/`: contratos del motor, carga de
  configuración, registro de adaptadores y componente que presenta los
  controles y resultados.
- `frontend/src/wasm/obliqueProjectile/`: módulo JavaScript generado para
  inicializar el motor WebAssembly.
- `frontend/public/wasm/obliqueProjectile/`: archivo `.wasm` servido como
  recurso estático.

Las rutas se declaran en `frontend/src/app/app.routes.ts`. El servicio HTTP
común define la URL base de la API; los servicios por dominio encapsulan las
operaciones de autenticación, perfiles, foros, publicaciones, comentarios y
simulaciones. Los tokens de sesión se guardan en `localStorage`; el interceptor
agrega el token de acceso a las solicitudes y solicita una renovación cuando
recibe una respuesta `401`.

### Requisitos y ejecución

- Node.js `^22.22.3`, `^24.15.0` o `>=26.0.0`, según los requisitos de Angular
  CLI instalados en este proyecto.
- npm `12.0.2`, versión declarada en `frontend/package.json`.
- Backend iniciado y accesible en `http://127.0.0.1:8000/api`.

El backend permite por defecto los orígenes `http://localhost:4200` y
`http://127.0.0.1:4200` cuando `DEBUG` está habilitado. Si se usa otro origen o
entorno, configurá CORS en el backend. La URL base de la API está definida en
`frontend/src/app/services/base-api.service.ts`; no se configura mediante una
variable de entorno del frontend.

Desde la raíz del repositorio, instalá las dependencias e iniciá el servidor de
desarrollo:

```bash
cd frontend
npm ci
npm start
```

La aplicación queda disponible en `http://localhost:4200/`. Para que las
pantallas que usan datos funcionen, iniciá también el backend.

### Pruebas y compilación

```bash
cd frontend
npm test
npm run build
```

`npm test` ejecuta las pruebas unitarias con Vitest y el builder de Angular.
`npm run build` genera la compilación de producción en
`frontend/dist/frontend/browser/`. Para una compilación de desarrollo con
reconstrucción al cambiar archivos:

```bash
cd frontend
npm run watch
```

El frontend usa Angular Router, formularios reactivos, `HttpClient` y RxJS.
WebAssembly ejecuta el motor del tiro oblicuo y Vitest se utiliza para las
pruebas unitarias.

## Backend

La API está construida con **Django 5.2** y **Django REST Framework**. Está
organizada en aplicaciones:

- `users`: cuentas, autenticación y perfiles.
- `simulations`: simulaciones, fenómenos y favoritos.
- `forums`: foros y membresías.
- `publications`: publicaciones que vinculan simulaciones y foros.
- `comments`: comentarios sobre publicaciones.
- `common`: permisos, paginación y formato de errores.

Django ORM administra los modelos y sus relaciones; los serializadores de DRF
validan las solicitudes y generan las respuestas JSON. La base configurada por
defecto es SQLite.

Las publicaciones y comentarios del foro se sincronizan en tiempo real mediante
WebSockets de Django Channels. En desarrollo se usa una capa de canales en memoria. Para
producción, instalar las dependencias de `backend/requirements.txt`, configurar
`REDIS_URL` y servir `principia.asgi:application` con un servidor ASGI; todos los
procesos deben compartir la misma instancia Redis. El origen del frontend debe
estar incluido en `DJANGO_CORS_ALLOWED_ORIGINS` para permitir la conexión.

### Requisitos y ejecución local

Se requiere Python 3.11 y las dependencias de `backend/requirements.txt`.
Django carga la configuración local desde `backend/.env`. Antes de iniciar el
servidor, verificá que ese archivo tenga estas variables:

- `DJANGO_DEBUG=true` para el entorno local y para habilitar el CORS del
  frontend en `localhost:4200` o `127.0.0.1:4200`.
- `DJANGO_SECRET_KEY`, con una clave local propia.
- `JWT_SECRET_KEY`, con una clave de al menos 32 caracteres.

No uses las claves de desarrollo en producción. Fuera de `DEBUG`, también se
requieren `DATA_ENCRYPTION_KEY` y `DATA_LOOKUP_KEY`; la configuración de
producción se detalla en [Autenticación y protección de datos](#autenticación-y-protección-de-datos).

Desde la raíz del repositorio, creá el entorno virtual, instalá las
dependencias y aplicá las migraciones:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
cd principia
python manage.py migrate
```

En macOS o Linux, activá el entorno con `source .venv/bin/activate` en lugar
del comando de PowerShell. Con el entorno activado y desde
`backend/principia/`, iniciá la API:

```powershell
python manage.py runserver 127.0.0.1:8000
```

La API queda disponible en `http://127.0.0.1:8000/api/`, que es la dirección
configurada por el frontend. Para crear una cuenta administradora local,
ejecutá `python manage.py createsuperuser` desde `backend/principia/`.

## Funcionalidades técnicas

### Autenticación y protección de datos

El usuario personalizado de Principia extiende `AbstractUser` de Django. El
registro valida la contraseña con los validadores de Django y crea la cuenta y
el perfil en una misma transacción.

El flujo de autenticación usa **Simple JWT**, una biblioteca externa que integra
JSON Web Tokens con Django REST Framework:

1. `POST /api/login/` comprueba las credenciales mediante la autenticación de
   Django.
2. Si son válidas, emite un token `access` (30 minutos) y uno `refresh` (1 día).
3. Las solicitudes autenticadas incluyen
   `Authorization: Bearer <access>`.
4. `POST /api/token/refresh/` permite renovar el acceso. Al cerrar sesión, el
   refresh se agrega a la blacklist de Simple JWT; también existe una operación
   para revocar los refresh tokens del usuario en todos sus dispositivos.

Los access tokens son stateless: cerrar sesión revoca la renovación, pero un
access ya emitido sigue siendo válido hasta expirar. La aplicación también
registra intentos de inicio de sesión: después de cinco fallos aplica un
bloqueo temporal de 30 minutos.

#### Hash de contraseña, Fernet y HMAC

Son mecanismos diferentes y cumplen propósitos distintos:

| Mecanismo | Uso en Principia |
| --- | --- |
| Hash de contraseña de Django | Guarda contraseñas de forma no reversible. La aplicación nunca necesita recuperar la contraseña original. |
| Fernet (`cryptography`) | Cifra `email`, `first_name` y `last_name` para poder recuperarlos cuando la aplicación los necesita. Es cifrado simétrico autenticado. |
| HMAC-SHA256 (biblioteca estándar de Python) | Genera índices no reversibles para buscar correos cifrados y contar intentos por nombre de usuario normalizado, sin guardar esos identificadores en texto claro en esos registros. |

El correo se normaliza antes de calcular su HMAC, lo que permite comparar
correos sin descifrar cada registro. `MultiFernet` permite leer datos cifrados
con claves anteriores durante una rotación, mientras la clave actual cifra los
nuevos valores. Para proteger los datos existentes, las claves deben guardarse
fuera del repositorio y mantenerse estables; en entornos no-debug se configuran
`JWT_SECRET_KEY`, `DATA_ENCRYPTION_KEY` y `DATA_LOOKUP_KEY` mediante variables
de entorno.

### Buenas prácticas de seguridad

El backend aplica controles en distintas capas:

| Área | Práctica implementada |
| --- | --- |
| Credenciales | Usa los validadores y el hash de contraseñas de Django; no almacena contraseñas en texto claro. |
| Sesiones API | Usa access tokens de corta duración y permite revocar refresh tokens. Los secretos se configuran fuera del código. |
| Datos personales | Cifra ciertos campos con Fernet y usa HMAC para comparaciones que no requieren recuperar el dato original. |
| Autorización | Combina autenticación, permisos por objeto, propiedad del recurso, visibilidad de simulaciones y membresía de foro. |
| Entradas y respuestas | Valida solicitudes con serializadores y expone campos explícitos en datos de usuario y perfil. |
| Configuración web | Limita CORS a orígenes configurados y, fuera de `DEBUG`, activa HSTS y encabezados de seguridad; las cookies de sesión y CSRF se marcan como seguras. |
| Consistencia | Usa restricciones únicas en la base de datos y transacciones para operaciones relacionadas, como el registro de cuenta y perfil. |

Estos controles complementan la configuración del entorno: en producción se
deben mantener `DEBUG` desactivado, usar claves secretas únicas y persistentes,
y servir la API únicamente mediante HTTPS. CORS limita los orígenes permitidos
por navegadores, pero no sustituye la autenticación ni la autorización.

### Simulaciones y comunidad

Los datos generales de una simulación se guardan por separado de los parámetros
propios de cada fenómeno. Un registro central asocia cada fenómeno con su
serializador y configuración. Actualmente está implementado el tiro oblicuo,
con velocidad inicial, ángulo y altura. El backend valida y guarda estos
parámetros; la ejecución visual corresponde al cliente.

La visibilidad puede ser `public`, `private` o `hidden`. Las reglas de acceso
consideran la propiedad de la simulación y, cuando corresponde, la pertenencia
al foro. Crear simulaciones no requiere publicarlas en un foro.

Los foros tienen un propietario y miembros. Las publicaciones vinculan una
simulación con su autor y, opcionalmente, un foro. Los usuarios pueden comentar
publicaciones y guardar simulaciones en favoritos. Los permisos restringen
estas acciones según autenticación, membresía, visibilidad y propiedad.
