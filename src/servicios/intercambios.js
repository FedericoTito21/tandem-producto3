// src/servicios/intercambios.js
// Reglas de negocio de los intercambios y de la selección del Dashboard.
import * as v from "../utils/validacion.js";
import { datosInvalidos, noEncontrado } from "../utils/errores.js";
import { TIPOS } from "../db/esquemas.js";

const LIMITE_MAXIMO = 100;
const CAMPOS_ORDEN = ["fecha", "titulo", "tipo", "creadoEn"];

/**
 * @param {object} repo
 */
export function crearServicioIntercambios(repo) {
  /** Valida y normaliza el filtro de búsqueda. */
  function limpiarFiltro(filtro = {}) {
    const f = {};
    if (filtro.tipo) {
      if (!TIPOS.includes(filtro.tipo)) throw datosInvalidos("Tipo de intercambio no válido.", "tipo");
      f.tipo = filtro.tipo;
    }
    if (filtro.email) f.email = v.email(filtro.email);
    if (filtro.texto) f.texto = v.longitud(v.texto(filtro.texto, "texto"), "texto", 1, 100);
    if (filtro.desde) f.desde = v.fecha(filtro.desde);
    if (filtro.hasta) f.hasta = v.fecha(filtro.hasta);
    if (f.desde && f.hasta && f.desde > f.hasta) throw datosInvalidos('"desde" no puede ser posterior a "hasta".', "desde");
    return f;
  }

  const servicio = {
    /**
     * obtenerIntercambios() del producto 2, ahora con filtros, orden y paginación.
     * @param {{filtro: object, orden: {campo: string, descendente: boolean}, limite: number, desplazamiento: number}} [opciones]
     * @returns {Promise<object[]>}
     */
    listar({ filtro, orden, limite = 50, desplazamiento = 0 } = {}) {
      if (!Number.isInteger(limite) || limite < 1 || limite > LIMITE_MAXIMO) {
        throw datosInvalidos(`"limite" debe estar entre 1 y ${LIMITE_MAXIMO}.`, "limite");
      }
      if (!Number.isInteger(desplazamiento) || desplazamiento < 0) throw datosInvalidos('"desplazamiento" no puede ser negativo.', "desplazamiento");
      const campo = orden?.campo ?? "fecha";
      if (!CAMPOS_ORDEN.includes(campo)) throw datosInvalidos("Campo de orden no válido.", "orden");
      const sentido = (orden?.descendente ?? true) ? -1 : 1;
      return repo.listar(limpiarFiltro(filtro), { campo, sentido }, limite, desplazamiento);
    },

    /** Cuántos intercambios cumplen el filtro (para paginar). */
    total: (filtro) => repo.contar(limpiarFiltro(filtro)),

    /**
     * Busca un intercambio por id.
     * @throws {GraphQLError} NOT_FOUND
     */
    async obtener(id) {
      const doc = await repo.porId(v.idMongo(id));
      if (!doc) throw noEncontrado("El intercambio no existe.");
      return doc;
    },

    /**
     * altaIntercambio() del producto 2.
     * @param {{titulo: string, email: string, fecha: string, descripcion: string, tipo: string}} entrada
     * @returns {Promise<object>}
     * @throws {GraphQLError} BAD_USER_INPUT
     */
    async alta(entrada) {
      if (!TIPOS.includes(entrada.tipo)) throw datosInvalidos("Tipo de intercambio no válido.", "tipo");
      return repo.insertar({
        titulo: v.longitud(v.texto(entrada.titulo, "titulo"), "titulo", 3, 100),
        email: v.email(entrada.email),
        fecha: v.fecha(entrada.fecha),
        descripcion: v.longitud(v.texto(entrada.descripcion, "descripcion"), "descripcion", 1, 500),
        tipo: entrada.tipo,
        creadoEn: new Date(),
      });
    },

    /**
     * borrarIntercambio() del producto 2. También lo quita de la selección.
     * @returns {Promise<object>} El intercambio borrado.
     * @throws {GraphQLError} NOT_FOUND
     */
    async borrar(id) {
      const doc = await servicio.obtener(id);
      await repo.borrar(id);
      await repo.deseleccionar(id);
      return doc;
    },

    /**
     * seleccionarIntercambio() del producto 2 (idempotente).
     * @throws {GraphQLError} NOT_FOUND si el intercambio no existe.
     */
    async seleccionar(id) {
      const doc = await servicio.obtener(id);
      await repo.seleccionar(id);
      return doc;
    },

    /**
     * deseleccionarIntercambio() del producto 2.
     * @throws {GraphQLError} NOT_FOUND si el intercambio no existe.
     */
    async deseleccionar(id) {
      const doc = await servicio.obtener(id);
      await repo.deseleccionar(id);
      return doc;
    },

    /** obtenerSeleccionados() del producto 2. */
    async seleccionados() {
      const ids = await repo.idsSeleccionados();
      return ids.length ? repo.listarPorIds(ids) : [];
    },

    /** Ids seleccionados (los usa el campo "seleccionado" de cada intercambio). */
    idsSeleccionados: () => repo.idsSeleccionados(),

    /**
     * Datos del gráfico: intercambios por mes, repartidos por tipo.
     * @returns {Promise<Array<{mes: string, total: number, ofrezco: number, busco: number}>>}
     */
    async estadisticasPorMes() {
      const filas = await repo.porMes();
      const meses = new Map();
      for (const { _id, total } of filas) {
        const m = meses.get(_id.mes) ?? { mes: _id.mes, total: 0, ofrezco: 0, busco: 0 };
        m.total += total;
        if (_id.tipo === "Ofrezco idioma") m.ofrezco += total;
        else m.busco += total;
        meses.set(_id.mes, m);
      }
      return [...meses.values()].sort((a, b) => a.mes.localeCompare(b.mes));
    },
  };
  return servicio;
}
