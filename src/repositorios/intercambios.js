// src/repositorios/intercambios.js
// Consultas a "intercambios" y "seleccionados": filtros, orden, paginación y agregación.
import { ObjectId } from "mongodb";
import { escaparRegex } from "../utils/validacion.js";

/**
 * Traduce el filtro de GraphQL a un filtro de MongoDB.
 * @param {{tipo: string, email: string, texto: string, desde: string, hasta: string}} [filtro]
 * @returns {object}
 */
export function construirFiltro(filtro = {}) {
  const f = {};
  if (filtro.tipo) f.tipo = filtro.tipo;
  if (filtro.email) f.email = filtro.email;
  if (filtro.desde || filtro.hasta) {
    // Las fechas son texto AAAA-MM-DD, así que se ordenan y comparan bien como texto.
    f.fecha = {};
    if (filtro.desde) f.fecha.$gte = filtro.desde;
    if (filtro.hasta) f.fecha.$lte = filtro.hasta;
  }
  if (filtro.texto) {
    const regex = { $regex: escaparRegex(filtro.texto), $options: "i" };
    f.$or = [{ titulo: regex }, { descripcion: regex }];
  }
  return f;
}

/**
 * @param {Db} bd
 */
export function crearRepoIntercambios(bd) {
  const col = bd.collection("intercambios");
  const sel = bd.collection("seleccionados");
  return {
    /**
     * Lista con filtro, orden y paginación.
     * @param {object} filtro Filtro de GraphQL.
     * @param {{campo: string, sentido: number}} orden
     * @param {number} limite
     * @param {number} desplazamiento
     */
    listar: (filtro, orden, limite, desplazamiento) =>
      col.find(construirFiltro(filtro)).sort({ [orden.campo]: orden.sentido, _id: 1 }).skip(desplazamiento).limit(limite).toArray(),
    contar: (filtro) => col.countDocuments(construirFiltro(filtro)),
    porId: (id) => col.findOne({ _id: new ObjectId(id) }),
    async insertar(doc) {
      const { insertedId } = await col.insertOne(doc);
      return { ...doc, _id: insertedId };
    },
    async borrar(id) {
      const { deletedCount } = await col.deleteOne({ _id: new ObjectId(id) });
      return deletedCount === 1;
    },
    /** Número de intercambios por mes y tipo (los datos del gráfico del producto 2). */
    porMes: () =>
      col
        .aggregate([
          { $group: { _id: { mes: { $substr: ["$fecha", 0, 7] }, tipo: "$tipo" }, total: { $sum: 1 } } },
          { $sort: { "_id.mes": 1 } },
        ])
        .toArray(),

    // --- Selección del Dashboard ---
    /** Marca como seleccionado (idempotente: si ya lo estaba no pasa nada). */
    seleccionar: (id) =>
      sel.updateOne({ _id: new ObjectId(id) }, { $set: { seleccionadoEn: new Date() } }, { upsert: true }),
    async deseleccionar(id) {
      const { deletedCount } = await sel.deleteOne({ _id: new ObjectId(id) });
      return deletedCount === 1;
    },
    /** Ids (texto) de todos los intercambios seleccionados. */
    async idsSeleccionados() {
      const docs = await sel.find({}).toArray();
      return docs.map((d) => String(d._id));
    },
    listarPorIds: (ids) => col.find({ _id: { $in: ids.map((i) => new ObjectId(i)) } }).sort({ fecha: -1 }).toArray(),
    borrarSeleccionTodo: () => sel.deleteMany({}),
    borrarTodos: () => col.deleteMany({}),
  };
}
