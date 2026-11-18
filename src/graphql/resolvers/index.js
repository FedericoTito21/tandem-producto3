// src/graphql/resolvers/index.js
// Junta los resolvers de cada módulo en un único objeto.
import { resolversUsuarios } from "./usuarios.js";
import { resolversIntercambios } from "./intercambios.js";

export const resolvers = {
  Query: { ...resolversUsuarios.Query, ...resolversIntercambios.Query },
  Mutation: { ...resolversUsuarios.Mutation, ...resolversIntercambios.Mutation },
  Usuario: resolversUsuarios.Usuario,
  Rol: resolversUsuarios.Rol,
  Intercambio: resolversIntercambios.Intercambio,
  TipoIntercambio: resolversIntercambios.TipoIntercambio,
  CampoOrden: resolversIntercambios.CampoOrden,
};
