// src/graphql/guardas.js
// Comprobaciones de seguridad que usan los resolvers antes de hacer nada.
import { noAutenticado, prohibido } from "../utils/errores.js";

/**
 * Exige haber hecho login.
 * @param {{usuario: {id: string, rol: string}|null}} ctx
 * @returns {{id: string, rol: string, nombre: string}} El usuario autenticado.
 * @throws {GraphQLError} UNAUTHENTICATED
 */
export function requiereLogin(ctx) {
  if (!ctx.usuario) throw noAutenticado();
  return ctx.usuario;
}

/**
 * Exige ser administrador.
 * @param {{usuario: {id: string, rol: string}|null}} ctx
 * @returns {{id: string, rol: string, nombre: string}}
 * @throws {GraphQLError} UNAUTHENTICATED o FORBIDDEN
 */
export function requiereAdmin(ctx) {
  const usuario = requiereLogin(ctx);
  if (usuario.rol !== "admin") throw prohibido("Solo el administrador puede hacer esto.");
  return usuario;
}
