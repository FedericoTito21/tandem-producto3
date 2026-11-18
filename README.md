# Tándem · Producto 3 (FP066): backend GraphQL + MongoDB

Backend del tándem lingüístico: **Node.js + Express 5 + Apollo Server 5 (GraphQL) + MongoDB** (driver oficial, sin Mongoose).
Es la portabilidad a servidor de `almacenaje.js` del producto 2. No tiene frontend: se prueba con **Postman**.

## Puesta en marcha

Necesitas Node.js 20.19 o superior y un MongoDB (elige UNA opción).

```bash
npm install
cp .env.example .env        # en Windows: copy .env.example .env
```

**A) MongoDB en un contenedor Docker (recomendado en local)**
```bash
docker compose up -d mongo   # solo la base de datos
npm start                    # el API en http://localhost:4000/graphql
```
O todo en Docker: `docker compose up --build`.

**B) MongoDB Atlas (CodeSandbox)**: en `.env` pon tu cadena `mongodb+srv://...` en `MONGODB_URI`
(en CodeSandbox, como variable de entorno del proyecto). Solo UNA cadena está activa a la vez.

Al arrancar se crea el administrador (`ADMIN_EMAIL` / `ADMIN_PASSWORD` del `.env`, por defecto `admin@tandem.com` / `admin1234`).

## Probar con Postman
1. Importa `postman/tandem-producto3.postman_collection.json`.
2. Ejecuta **Login admin**: el token se guarda solo y se envía en las demás peticiones.
3. Ejecuta **Datos de demo** y después el resto de carpetas.

Todas las peticiones son `POST http://localhost:4000/graphql` con cuerpo GraphQL. Sin token solo funciona `login`.

## Correspondencia con almacenaje.js (producto 2)

| Producto 2 (almacenaje.js) | GraphQL |
|---|---|
| obtenerUsuarios | `Query.usuarios` (y `usuario(id)`) |
| altaUsuario | `Mutation.altaUsuario` |
| borrarUsuario | `Mutation.borrarUsuario` |
| loguearUsuario | `Mutation.login` (devuelve un token JWT) |
| obtenerUsuarioActivo | `Query.yo` |
| cerrarSesion | no hay sesión en el servidor: el cliente descarta el token |
| altaIntercambio | `Mutation.altaIntercambio` |
| obtenerIntercambios | `Query.intercambios` (+ filtro, orden, paginación) y `totalIntercambios` |
| borrarIntercambio | `Mutation.borrarIntercambio` |
| seleccionarIntercambio / deseleccionarIntercambio | `Mutation.seleccionarIntercambio` / `deseleccionarIntercambio` |
| obtenerSeleccionados | `Query.intercambiosSeleccionados` |
| iniciarDatosDemo | `Mutation.cargarDatosDemo` |
| (gráfico canvas) | `Query.estadisticasPorMes` |

Types: `Usuario`, `Intercambio` (los objetos del producto 2). Enums: `TipoIntercambio`, `Rol`, `CampoOrden`.

## Estructura
```
src/
  server.js            arranque (conecta, crea admin, escucha)
  app.js               Express + Apollo (cors, límite de peticiones, 404, errores)
  config/entorno.js    variables de entorno
  db/                  conexion.js (MongoClient) y esquemas.js ($jsonSchema + índices)
  repositorios/        consultas a MongoDB (sin reglas de negocio)
  servicios/           reglas de negocio y validaciones (usuarios, intercambios, auth, demo)
  graphql/             typeDefs.js (esquema), resolvers/, contexto.js, guardas.js
  utils/               errores.js, validacion.js
test/                  pruebas (node:test) con una BD falsa en memoria
postman/               colección de Postman
```
Flujo: **resolver → servicio → repositorio → MongoDB**. Los resolvers solo comprueban permisos y delegan.

## Seguridad
- Contraseñas cifradas con **bcrypt**; nunca salen en el API.
- **Login con JWT** (HS256, caduca en `JWT_EXPIRA`). Mismo mensaje de error si falla el email o la contraseña.
- Todas las consultas exigen login; todas las escrituras exigen rol **admin** (en este producto solo usa la webapp el administrador).
- Validación en el servidor (longitudes, email, fecha real, tipo) y en MongoDB (`$jsonSchema`) más índice único de email.
- Búsqueda por texto con la regex escapada (sin inyección), límite de 100 resultados, límite de peticiones por minuto, cuerpo máximo 100 KB.
- Errores controlados con códigos (`UNAUTHENTICATED`, `FORBIDDEN`, `BAD_USER_INPUT`, `NOT_FOUND`, `CONFLICT`); los fallos internos no se filtran al cliente.
- En producción (`NODE_ENV=production`) exige un `JWT_SECRET` largo y otra contraseña de admin.

## Pruebas y documentación
```bash
npm test        # 13 pruebas de extremo a extremo (HTTP + GraphQL) con BD falsa en memoria
npm run docs    # genera la documentación JSDoc en docs/index.html
```
Las pruebas automáticas usan una base de datos falsa; para validar contra un MongoDB real sigue la
colección de Postman con el contenedor Docker levantado.

## Ejemplo
```graphql
mutation { login(email: "admin@tandem.com", password: "admin1234") { token } }
```
Cabecera de las siguientes peticiones: `Authorization: Bearer <token>`.
