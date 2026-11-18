// src/graphql/typeDefs.js
// El ESQUEMA de GraphQL: los Type (objetos del producto 2), los Input, las Query (leer) y las Mutation (escribir).
// Cada operación corresponde a una función de almacenaje.js del producto 2 (se indica en el comentario).

export const typeDefs = `#graphql
  "Tipo de intercambio (en la base de datos se guarda como 'Ofrezco idioma' / 'Busco idioma')."
  enum TipoIntercambio { OFREZCO_IDIOMA BUSCO_IDIOMA }

  "Rol del usuario. Solo el ADMIN puede escribir datos."
  enum Rol { ADMIN USUARIO }

  "Campos por los que se puede ordenar la lista de intercambios."
  enum CampoOrden { FECHA TITULO TIPO CREADO_EN }

  "Usuario de la webapp. La contraseña nunca se devuelve."
  type Usuario {
    id: ID!
    nombre: String!
    email: String!
    rol: Rol!
    creadoEn: String!
  }

  "Intercambio de idiomas (mismo objeto que en el producto 2)."
  type Intercambio {
    id: ID!
    titulo: String!
    email: String!
    "Formato AAAA-MM-DD"
    fecha: String!
    descripcion: String!
    tipo: TipoIntercambio!
    creadoEn: String!
    "true si está en la selección del Dashboard"
    seleccionado: Boolean!
  }

  "Respuesta del login: el token se envía después en la cabecera Authorization: Bearer <token>."
  type AuthPayload {
    token: String!
    usuario: Usuario!
  }

  "Datos del gráfico: intercambios de un mes (AAAA-MM)."
  type EstadisticaMes {
    mes: String!
    total: Int!
    ofrezco: Int!
    busco: Int!
  }

  type ResultadoDemo {
    usuariosCreados: Int!
    intercambiosCreados: Int!
  }

  input NuevoUsuario {
    nombre: String!
    email: String!
    password: String!
    rol: Rol = USUARIO
  }

  input NuevoIntercambio {
    titulo: String!
    email: String!
    fecha: String!
    descripcion: String!
    tipo: TipoIntercambio!
  }

  "Filtros opcionales; se combinan con AND. 'texto' busca en título y descripción."
  input FiltroIntercambios {
    tipo: TipoIntercambio
    email: String
    texto: String
    desde: String
    hasta: String
  }

  input OrdenIntercambios {
    campo: CampoOrden = FECHA
    descendente: Boolean = true
  }

  type Query {
    "obtenerUsuarioActivo(): el usuario dueño del token."
    yo: Usuario!
    "obtenerUsuarios()"
    usuarios: [Usuario!]!
    usuario(id: ID!): Usuario!
    "obtenerIntercambios() con filtro, orden y paginación."
    intercambios(filtro: FiltroIntercambios, orden: OrdenIntercambios, limite: Int = 50, desplazamiento: Int = 0): [Intercambio!]!
    "Total de intercambios que cumplen el filtro (para paginar)."
    totalIntercambios(filtro: FiltroIntercambios): Int!
    intercambio(id: ID!): Intercambio!
    "obtenerSeleccionados()"
    intercambiosSeleccionados: [Intercambio!]!
    "Datos para el gráfico por meses."
    estadisticasPorMes: [EstadisticaMes!]!
  }

  type Mutation {
    "loguearUsuario(): devuelve un token. Es la única operación que no exige login."
    login(email: String!, password: String!): AuthPayload!
    "altaUsuario()"
    altaUsuario(entrada: NuevoUsuario!): Usuario!
    "borrarUsuario()"
    borrarUsuario(id: ID!): Usuario!
    "altaIntercambio()"
    altaIntercambio(entrada: NuevoIntercambio!): Intercambio!
    "borrarIntercambio()"
    borrarIntercambio(id: ID!): Intercambio!
    "seleccionarIntercambio()"
    seleccionarIntercambio(id: ID!): Intercambio!
    "deseleccionarIntercambio()"
    deseleccionarIntercambio(id: ID!): Intercambio!
    "iniciarDatosDemo()"
    cargarDatosDemo: ResultadoDemo!
  }
`;
