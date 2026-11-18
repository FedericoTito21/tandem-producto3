// src/repositorios/usuarios.js
// Consultas a la colección "usuarios". Aquí solo hay acceso a datos, sin reglas de negocio.
import { ObjectId } from "mongodb";

/**
 * @param {Db} bd
 */
export function crearRepoUsuarios(bd) {
  const col = bd.collection("usuarios");
  return {
    /** Todos los usuarios, ordenados por nombre. */
    listar: () => col.find({}).sort({ nombre: 1 }).toArray(),
    /** @param {string} id */
    porId: (id) => col.findOne({ _id: new ObjectId(id) }),
    /** @param {string} email Ya normalizado en minúsculas. */
    porEmail: (email) => col.findOne({ email }),
    /** Inserta y devuelve el documento con su _id. */
    async insertar(doc) {
      const { insertedId } = await col.insertOne(doc);
      return { ...doc, _id: insertedId };
    },
    /** @returns {Promise<boolean>} true si se borró. */
    async borrar(id) {
      const { deletedCount } = await col.deleteOne({ _id: new ObjectId(id) });
      return deletedCount === 1;
    },
    contar: (filtro = {}) => col.countDocuments(filtro),
  };
}
