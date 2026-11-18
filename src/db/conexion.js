// src/db/conexion.js
// Conexión a MongoDB (local, contenedor Docker o Atlas: solo cambia MONGODB_URI).
import { MongoClient } from "mongodb";
import { prepararBD } from "./esquemas.js";

/** @type {MongoClient|null} */
let cliente = null;
/** @type {Db|null} */
let bd = null;

/**
 * Conecta con MongoDB, prepara colecciones/índices y devuelve la base de datos.
 * @param {{mongoUri: string, nombreBD: string}} config
 * @returns {Promise<Db>}
 * @throws {Error} Si no se puede conectar en 5 segundos.
 */
export async function conectar({ mongoUri, nombreBD }) {
  cliente = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 5000 });
  await cliente.connect();
  bd = cliente.db(nombreBD);
  await prepararBD(bd);
  return bd;
}

/**
 * Devuelve la base de datos ya conectada.
 * @returns {Db}
 * @throws {Error} Si todavía no se ha llamado a conectar().
 */
export function obtenerBD() {
  if (!bd) throw new Error("La base de datos no está conectada todavía.");
  return bd;
}

/** Cierra la conexión (se usa al apagar el servidor). */
export async function desconectar() {
  await cliente?.close();
  cliente = null;
  bd = null;
}
