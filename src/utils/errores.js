// src/utils/errores.js
// Errores de la aplicación. Cada uno lleva un "code" que GraphQL devuelve al cliente en extensions.code.
import { GraphQLError } from "graphql";

/**
 * Crea un GraphQLError con un código estándar.
 * @param {string} mensaje Texto para el cliente.
 * @param {string} code Código (UNAUTHENTICATED, FORBIDDEN, BAD_USER_INPUT, NOT_FOUND, CONFLICT...).
 * @param {Record<string, unknown>} [extra] Datos adicionales (p. ej. el campo inválido).
 * @returns {GraphQLError}
 */
function crear(mensaje, code, extra = {}) {
  return new GraphQLError(mensaje, { extensions: { code, ...extra } });
}

/** Falta el login o el token no es válido. */
export const noAutenticado = (mensaje = "Debes iniciar sesión.") => crear(mensaje, "UNAUTHENTICATED");
/** Hay login pero no permisos suficientes. */
export const prohibido = (mensaje = "No tienes permisos para esta operación.") => crear(mensaje, "FORBIDDEN");
/** Datos de entrada incorrectos. */
export const datosInvalidos = (mensaje, campo) => crear(mensaje, "BAD_USER_INPUT", campo ? { campo } : {});
/** El recurso no existe. */
export const noEncontrado = (mensaje = "No se ha encontrado el recurso.") => crear(mensaje, "NOT_FOUND");
/** Conflicto, por ejemplo un email repetido. */
export const conflicto = (mensaje) => crear(mensaje, "CONFLICT");
