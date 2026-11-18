// src/servicios/auth.js
// Login y tokens JWT. Sustituye a loguearUsuario() / obtenerUsuarioActivo() / cerrarSesion() del producto 2.
// No hay sesiones en el servidor: el token lleva la identidad y caduca solo (cerrar sesión = descartar el token).
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import * as v from "../utils/validacion.js";
import { noAutenticado } from "../utils/errores.js";

// Se compara contra este hash cuando el email no existe, para que tarde lo mismo y no revele qué emails hay.
const HASH_FALSO = bcrypt.hashSync("no-existe", 10);

/**
 * @param {object} repoUsuarios
 * @param {Config} config
 */
export function crearServicioAuth(repoUsuarios, config) {
  return {
    /**
     * Comprueba email y contraseña y devuelve un token.
     * @param {string} emailEntrada
     * @param {string} passwordEntrada
     * @returns {Promise<{token: string, usuario: object}>}
     * @throws {GraphQLError} UNAUTHENTICATED con el mismo mensaje si falla el email o la contraseña.
     */
    async login(emailEntrada, passwordEntrada) {
      const email = v.email(emailEntrada);
      const usuario = await repoUsuarios.porEmail(email);
      const correcto = await bcrypt.compare(String(passwordEntrada ?? ""), usuario?.passwordHash ?? HASH_FALSO);
      if (!usuario || !correcto) throw noAutenticado("Correo o contraseña incorrectos.");
      const token = jwt.sign({ rol: usuario.rol, nombre: usuario.nombre }, config.jwtSecreto, {
        subject: String(usuario._id),
        expiresIn: config.jwtExpira,
        algorithm: "HS256",
      });
      return { token, usuario };
    },

    /**
     * Lee un token. Devuelve null (en vez de lanzar error) si falta, es falso o ha caducado.
     * @param {string|undefined} token
     * @returns {{id: string, rol: string, nombre: string}|null}
     */
    verificar(token) {
      if (!token) return null;
      try {
        const p = jwt.verify(token, config.jwtSecreto, { algorithms: ["HS256"] });
        return { id: String(p.sub), rol: p.rol, nombre: p.nombre };
      } catch {
        return null;
      }
    },

    /**
     * Crea el administrador inicial si no existe (el único que usa la webapp en el producto 3).
     * @param {object} servicioUsuarios
     * @returns {Promise<boolean>} true si lo ha creado.
     */
    async asegurarAdmin(servicioUsuarios) {
      if (await repoUsuarios.porEmail(config.adminEmail)) return false;
      await servicioUsuarios.alta({ nombre: "Administrador", email: config.adminEmail, password: config.adminPassword, rol: "admin" });
      return true;
    },
  };
}
