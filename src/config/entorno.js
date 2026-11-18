// src/config/entorno.js
// Lee las variables de entorno (fichero .env) y las deja en un único objeto de configuración.
import "dotenv/config";

/**
 * Configuración de la aplicación.
 * @typedef {Object} Config
 * @property {number} puerto Puerto HTTP del servidor.
 * @property {string} mongoUri Cadena de conexión de MongoDB (local, Docker o Atlas).
 * @property {string} nombreBD Nombre de la base de datos.
 * @property {string} jwtSecreto Secreto con el que se firman los tokens.
 * @property {string} jwtExpira Duración del token (p. ej. "2h").
 * @property {string} adminEmail Correo del administrador que se crea al arrancar.
 * @property {string} adminPassword Contraseña inicial del administrador.
 * @property {boolean} produccion true si NODE_ENV === "production".
 */

/**
 * Construye la configuración a partir de un objeto de variables (por defecto process.env).
 * @param {Record<string, string|undefined>} [env=process.env]
 * @returns {Config}
 */
export function leerConfig(env = process.env) {
  return {
    puerto: Number(env.PORT ?? 4000),
    mongoUri: env.MONGODB_URI ?? "mongodb://localhost:27017",
    nombreBD: env.MONGODB_DB ?? "tandem",
    jwtSecreto: env.JWT_SECRET ?? "secreto-solo-para-desarrollo",
    jwtExpira: env.JWT_EXPIRA ?? "2h",
    adminEmail: (env.ADMIN_EMAIL ?? "admin@tandem.com").trim().toLowerCase(),
    adminPassword: env.ADMIN_PASSWORD ?? "admin1234",
    produccion: env.NODE_ENV === "production",
  };
}

/**
 * Comprueba que la configuración es segura antes de arrancar.
 * En producción exige un secreto propio y largo y una contraseña de admin distinta de la de ejemplo.
 * @param {Config} config
 * @throws {Error} Si la configuración no es válida.
 */
export function validarConfig(config) {
  if (!Number.isInteger(config.puerto) || config.puerto <= 0) {
    throw new Error("PORT no es un número de puerto válido.");
  }
  if (config.produccion) {
    if (config.jwtSecreto.length < 24 || config.jwtSecreto.startsWith("secreto-solo")) {
      throw new Error("En producción JWT_SECRET debe tener al menos 24 caracteres y no ser el de ejemplo.");
    }
    if (config.adminPassword === "admin1234") {
      throw new Error("En producción cambia ADMIN_PASSWORD (no uses la de ejemplo).");
    }
  }
}

export const config = leerConfig();
