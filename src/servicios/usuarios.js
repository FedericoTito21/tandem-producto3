// src/servicios/usuarios.js
// Reglas de negocio de los usuarios (equivale a las funciones de usuarios de almacenaje.js del producto 2).
import bcrypt from "bcryptjs";
import * as v from "../utils/validacion.js";
import { conflicto, noEncontrado, prohibido } from "../utils/errores.js";

const COSTE_BCRYPT = 10;

/**
 * @param {object} repo
 */
export function crearServicioUsuarios(repo) {
  return {
    /**
     * obtenerUsuarios() del producto 2.
     * @returns {Promise<object[]>}
     */
    listar: () => repo.listar(),

    /**
     * Busca un usuario por id.
     * @param {string} id
     * @throws {GraphQLError} NOT_FOUND si no existe.
     */
    async obtener(id) {
      const usuario = await repo.porId(v.idMongo(id));
      if (!usuario) throw noEncontrado("El usuario no existe.");
      return usuario;
    },

    /**
     * altaUsuario() del producto 2. Valida, normaliza el email y guarda la contraseña CIFRADA.
     * @param {{nombre: string, email: string, password: string, rol: string}} entrada
     * @returns {Promise<object>} El usuario creado.
     * @throws {GraphQLError} BAD_USER_INPUT si algún dato es inválido, CONFLICT si el email ya existe.
     */
    async alta(entrada) {
      const doc = {
        nombre: v.nombre(entrada.nombre),
        email: v.email(entrada.email),
        passwordHash: await bcrypt.hash(v.password(entrada.password), COSTE_BCRYPT),
        rol: entrada.rol ?? "usuario",
        creadoEn: new Date(),
      };
      if (await repo.porEmail(doc.email)) throw conflicto("Ya existe un usuario con este email.");
      try {
        return await repo.insertar(doc);
      } catch (error) {
        // 11000 = clave duplicada: dos peticiones simultáneas con el mismo email (lo frena el índice único).
        if (error?.code === 11000) throw conflicto("Ya existe un usuario con este email.");
        throw error;
      }
    },

    /**
     * borrarUsuario() del producto 2.
     * @param {string} id
     * @param {{id: string}} actor Quien hace la petición (no puede borrarse a sí mismo).
     * @returns {Promise<object>} El usuario borrado.
     * @throws {GraphQLError} NOT_FOUND, FORBIDDEN.
     */
    async borrar(id, actor) {
      const usuario = await this.obtener(id);
      if (String(usuario._id) === String(actor.id)) throw prohibido("No puedes borrar tu propio usuario.");
      await repo.borrar(id);
      return usuario;
    },
  };
}
