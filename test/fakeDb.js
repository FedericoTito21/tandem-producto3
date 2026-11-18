// test/fakeDb.js
// Base de datos FALSA en memoria con la parte del driver de MongoDB que usa la aplicación.
// Sirve para probar la lógica sin tener un MongoDB instalado. NO sustituye a probar con MongoDB real
// (ver README: sección "Probar con MongoDB real").
import { ObjectId } from "mongodb";

const esOp = (o) => o && typeof o === "object" && !(o instanceof ObjectId) && !(o instanceof Date) && !Array.isArray(o) && Object.keys(o).some((k) => k.startsWith("$"));
const igual = (a, b) => (a instanceof ObjectId || b instanceof ObjectId ? String(a) === String(b) : a === b);

/** Lee un campo con notación de puntos ("_id.mes"). */
const leer = (doc, ruta) => ruta.split(".").reduce((o, k) => (o == null ? undefined : o[k]), doc);

function cumple(doc, filtro) {
  return Object.entries(filtro).every(([campo, cond]) => {
    if (campo === "$or") return cond.some((f) => cumple(doc, f));
    const valor = leer(doc, campo);
    if (!esOp(cond)) return igual(valor, cond);
    return Object.entries(cond).every(([op, arg]) => {
      if (op === "$in") return arg.some((x) => igual(valor, x));
      if (op === "$gte") return valor >= arg;
      if (op === "$lte") return valor <= arg;
      if (op === "$regex") return new RegExp(arg, cond.$options ?? "").test(valor ?? "");
      if (op === "$options") return true;
      throw new Error(`Operador no soportado en la BD falsa: ${op}`);
    });
  });
}

function evaluar(expr, doc) {
  if (typeof expr === "string" && expr.startsWith("$")) return leer(doc, expr.slice(1));
  if (expr && expr.$substr) {
    const [campo, ini, len] = expr.$substr;
    return String(evaluar(campo, doc)).substr(ini, len);
  }
  if (expr && typeof expr === "object") return Object.fromEntries(Object.entries(expr).map(([k, e]) => [k, evaluar(e, doc)]));
  return expr;
}

function ordenar(docs, spec) {
  return [...docs].sort((a, b) => {
    for (const [campo, sentido] of Object.entries(spec)) {
      const x = leer(a, campo), y = leer(b, campo);
      const c = String(x).localeCompare(String(y), "es", { numeric: true });
      if (c !== 0) return c * sentido;
    }
    return 0;
  });
}

class Coleccion {
  constructor() { this.docs = []; this.unicos = []; }
  async createIndex(clave, opciones = {}) { if (opciones.unique) this.unicos.push(Object.keys(clave)); return opciones.name ?? "idx"; }
  #comprobarUnicos(doc, ignorar) {
    for (const campos of this.unicos) {
      if (this.docs.some((d) => d !== ignorar && campos.every((c) => d[c] === doc[c]))) {
        throw Object.assign(new Error("E11000 duplicate key error"), { code: 11000 });
      }
    }
  }
  async insertOne(doc) {
    const nuevo = { ...doc, _id: doc._id ?? new ObjectId() };
    this.#comprobarUnicos(nuevo);
    this.docs.push(nuevo);
    return { insertedId: nuevo._id };
  }
  async findOne(filtro) { return this.docs.find((d) => cumple(d, filtro)) ?? null; }
  find(filtro = {}) {
    let res = this.docs.filter((d) => cumple(d, filtro));
    const cursor = {
      sort: (s) => ((res = ordenar(res, s)), cursor),
      skip: (n) => ((res = res.slice(n)), cursor),
      limit: (n) => ((res = res.slice(0, n)), cursor),
      toArray: async () => res,
    };
    return cursor;
  }
  async countDocuments(filtro = {}) { return this.docs.filter((d) => cumple(d, filtro)).length; }
  async deleteOne(filtro) {
    const i = this.docs.findIndex((d) => cumple(d, filtro));
    if (i >= 0) this.docs.splice(i, 1);
    return { deletedCount: i >= 0 ? 1 : 0 };
  }
  async deleteMany(filtro = {}) {
    const antes = this.docs.length;
    this.docs = this.docs.filter((d) => !cumple(d, filtro));
    return { deletedCount: antes - this.docs.length };
  }
  async updateOne(filtro, cambio, { upsert = false } = {}) {
    const doc = this.docs.find((d) => cumple(d, filtro));
    if (doc) { Object.assign(doc, cambio.$set); return { matchedCount: 1, upsertedCount: 0 }; }
    if (!upsert) return { matchedCount: 0, upsertedCount: 0 };
    this.docs.push({ ...Object.fromEntries(Object.entries(filtro).filter(([k]) => !k.startsWith("$"))), ...cambio.$set });
    return { matchedCount: 0, upsertedCount: 1 };
  }
  aggregate(pipeline) {
    return { toArray: async () => {
      let res = [...this.docs];
      for (const etapa of pipeline) {
        if (etapa.$group) {
          const grupos = new Map();
          for (const d of res) {
            const id = evaluar(etapa.$group._id, d);
            const clave = JSON.stringify(id);
            const g = grupos.get(clave) ?? { _id: id, total: 0 };
            g.total += 1; // única acumulación soportada: { total: { $sum: 1 } }
            grupos.set(clave, g);
          }
          res = [...grupos.values()];
        } else if (etapa.$sort) res = ordenar(res, etapa.$sort);
        else throw new Error("Etapa no soportada en la BD falsa");
      }
      return res;
    } };
  }
}

/** Crea una BD falsa con la misma forma que `client.db()`. */
export function crearBDFalsa() {
  const cols = new Map();
  return {
    collection(nombre) { if (!cols.has(nombre)) cols.set(nombre, new Coleccion()); return cols.get(nombre); },
    async createCollection(nombre) { this.collection(nombre); },
    async command() { return { ok: 1 }; },
  };
}
