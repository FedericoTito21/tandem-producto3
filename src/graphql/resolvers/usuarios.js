// src/graphql/resolvers/usuarios.js
import { requiereAdmin, requiereLogin } from "../guardas.js";

/** Resolvers de los usuarios y del login. */
export const resolversUsuarios = {
  Query: {
    yo: (_, __, ctx) => ctx.servicios.usuarios.obtener(requiereLogin(ctx).id),
    usuarios: (_, __, ctx) => (requiereLogin(ctx), ctx.servicios.usuarios.listar()),
    usuario: (_, { id }, ctx) => (requiereLogin(ctx), ctx.servicios.usuarios.obtener(id)),
  },
  Mutation: {
    login: (_, { email, password }, ctx) => ctx.servicios.auth.login(email, password),
    altaUsuario: (_, { entrada }, ctx) => (requiereAdmin(ctx), ctx.servicios.usuarios.alta(entrada)),
    borrarUsuario: (_, { id }, ctx) => ctx.servicios.usuarios.borrar(id, requiereAdmin(ctx)),
  },
  // Los campos del documento de MongoDB no se llaman igual que en GraphQL: aquí se traducen.
  Usuario: {
    id: (u) => String(u._id),
    creadoEn: (u) => u.creadoEn.toISOString(),
  },
  Rol: { ADMIN: "admin", USUARIO: "usuario" },
};
