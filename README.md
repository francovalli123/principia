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

### Contenido

- [Backend](#backend)
- [Autenticación y protección de datos](#autenticación-y-protección-de-datos)
- [Buenas prácticas de seguridad](#buenas-prácticas-de-seguridad)
- [Simulaciones y comunidad](#simulaciones-y-comunidad)
- [API](#api)
- [Dependencias](#dependencias-principales)
- [Ejecución local](#ejecutar-localmente)

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
1. Credenciales: usa los validadores y el hash de contraseñas de Django; no almacena contraseñas en texto claro. 
2. Sesiones API: usa access tokens de corta duración y permite revocar refresh tokens. Los secretos se configuran fuera del código. 
3. Datos personales: cifra ciertos campos con Fernet y usa HMAC para comparaciones que no requieren recuperar el dato original.
4. Autorización: combina autenticación, permisos por objeto, propiedad del recurso, visibilidad de simulaciones y membresía de foro.
5. Entradas y respuestas: valida solicitudes con serializadores y expone campos explícitos en datos de usuario y perfil.
6. Configuración web: limita CORS a orígenes configurados y, fuera de `DEBUG`, activa HSTS y encabezados de seguridad; las cookies de sesión y CSRF se marcan como seguras.
7. Consistencia: usa restricciones únicas en la base de datos y transacciones para operaciones relacionadas, como el registro de cuenta y perfil.
8. Se utiliza Rate Limiting para evitar ataques de fuerza bruta. 

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
