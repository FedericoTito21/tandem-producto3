// src/db/esquemas.js
// Modelos de las colecciones SIN Mongoose: validadores $jsonSchema (los aplica el propio MongoDB) + índices.
// Así aunque alguien escriba directamente en la base de datos, los documentos siguen siendo correctos.

/** Tipos de intercambio permitidos (los mismos textos que el producto 2). */
export const TIPOS = ["Ofrezco idioma", "Busco idioma"];

/** Roles permitidos. */
export const ROLES = ["admin", "usuario"];

/**
 * Definición de cada colección: validador e índices.
 * @type {Object<string, object>}
 */
export const COLECCIONES = {
  usuarios: {
    validador: {
      $jsonSchema: {
        bsonType: "object",
        required: ["nombre", "email", "passwordHash", "rol", "creadoEn"],
        properties: {
          nombre: { bsonType: "string", minLength: 2, maxLength: 50 },
          email: { bsonType: "string", maxLength: 120, pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" },
          passwordHash: { bsonType: "string", minLength: 20 },
          rol: { enum: ROLES },
          creadoEn: { bsonType: "date" },
        },
      },
    },
    indices: [{ clave: { email: 1 }, opciones: { unique: true, name: "email_unico" } }],
  },
  intercambios: {
    validador: {
      $jsonSchema: {
        bsonType: "object",
        required: ["titulo", "email", "fecha", "descripcion", "tipo", "creadoEn"],
        properties: {
          titulo: { bsonType: "string", minLength: 3, maxLength: 100 },
          email: { bsonType: "string", maxLength: 120 },
          fecha: { bsonType: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          descripcion: { bsonType: "string", minLength: 1, maxLength: 500 },
          tipo: { enum: TIPOS },
          creadoEn: { bsonType: "date" },
        },
      },
    },
    indices: [
      { clave: { fecha: -1 }, opciones: { name: "por_fecha" } },
      { clave: { email: 1 }, opciones: { name: "por_email" } },
      { clave: { tipo: 1, fecha: -1 }, opciones: { name: "por_tipo_fecha" } },
    ],
  },
  seleccionados: {
    // La selección del Dashboard: un documento por intercambio seleccionado (su _id es el del intercambio).
    validador: {
      $jsonSchema: { bsonType: "object", required: ["_id", "seleccionadoEn"], properties: { seleccionadoEn: { bsonType: "date" } } },
    },
    indices: [],
  },
};

/**
 * Crea las colecciones (o actualiza su validador si ya existen) y sus índices.
 * Es idempotente: se puede llamar en cada arranque.
 * @param {Db} bd
 * @returns {Promise<void>}
 */
export async function prepararBD(bd) {
  for (const [nombre, { validador, indices }] of Object.entries(COLECCIONES)) {
    try {
      await bd.createCollection(nombre, { validator: validador });
    } catch (error) {
      // 48 = NamespaceExists: la colección ya existe, solo actualizamos su validador.
      if (error?.code !== 48) throw error;
      await bd.command({ collMod: nombre, validator: validador });
    }
    for (const { clave, opciones } of indices) {
      await bd.collection(nombre).createIndex(clave, opciones);
    }
  }
}
