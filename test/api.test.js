// test/api.test.js
// Pruebas de extremo a extremo: se arranca la app Express real y se llama a /graphql por HTTP,
// igual que haría Postman. La base de datos es la falsa (test/fakeDb.js).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { leerConfig } from "../src/config/entorno.js";
import { prepararBD } from "../src/db/esquemas.js";
import { crearServicios } from "../src/servicios/index.js";
import { crearApp } from "../src/app.js";
import { crearBDFalsa } from "./fakeDb.js";

let servidor, url, apollo;
let tokenAdmin, tokenUsuario;
const config = leerConfig({ ADMIN_EMAIL: "admin@tandem.com", ADMIN_PASSWORD: "admin1234", JWT_SECRET: "secreto-de-pruebas-largo-123456" });

/** Lanza una operación GraphQL y devuelve el JSON de la respuesta. */
async function gql(query, variables = {}, token) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query, variables }),
  });
  return r.json();
}
const codigo = (res) => res.errors?.[0]?.extensions?.code;

before(async () => {
  const bd = crearBDFalsa();
  await prepararBD(bd);
  const servicios = crearServicios(bd, config);
  await servicios.auth.asegurarAdmin(servicios.usuarios);
  ({ app: servidor, apollo } = await crearApp({ servicios, config, limitePorMinuto: 10_000 }));
  const http = servidor.listen(0);
  servidor = http;
  url = `http://localhost:${http.address().port}/graphql`;
  const login = await gql("mutation($e:String!,$p:String!){login(email:$e,password:$p){token}}", { e: "admin@tandem.com", p: "admin1234" });
  tokenAdmin = login.data.login.token;
});

after(async () => { servidor.close(); await apollo.stop(); });

const ALTA_INT = `mutation($e: NuevoIntercambio!){ altaIntercambio(entrada:$e){ id titulo tipo fecha seleccionado } }`;
const NUEVO = { titulo: "Inglés los martes", email: "john@tandem.com", fecha: "2026-11-03", descripcion: "Una hora por videollamada", tipo: "OFREZCO_IDIOMA" };

test("sin token no se puede leer nada", async () => {
  const r = await gql("{ usuarios { id } }");
  assert.equal(codigo(r), "UNAUTHENTICATED");
});

test("login: credenciales incorrectas -> mismo error con email inexistente o contraseña mala", async () => {
  const a = await gql("mutation{login(email:\"admin@tandem.com\",password:\"mala-mala\"){token}}");
  const b = await gql("mutation{login(email:\"nadie@tandem.com\",password:\"mala-mala\"){token}}");
  assert.equal(codigo(a), "UNAUTHENTICATED");
  assert.equal(a.errors[0].message, b.errors[0].message);
});

test("token falso o manipulado se rechaza", async () => {
  const r = await gql("{ yo { id } }", {}, tokenAdmin.slice(0, -3) + "abc");
  assert.equal(codigo(r), "UNAUTHENTICATED");
});

test("yo devuelve al admin y nunca expone la contraseña", async () => {
  const r = await gql("{ yo { nombre email rol } }", {}, tokenAdmin);
  assert.deepEqual(r.data.yo, { nombre: "Administrador", email: "admin@tandem.com", rol: "ADMIN" });
  const x = await gql("{ yo { passwordHash } }", {}, tokenAdmin);
  assert.ok(x.errors, "el campo passwordHash no debe existir en el esquema");
});

test("alta de usuario: valida datos, normaliza email y rechaza duplicados", async () => {
  const Q = "mutation($e:NuevoUsuario!){ altaUsuario(entrada:$e){ id nombre email rol } }";
  const ok = await gql(Q, { e: { nombre: "Laura Puig", email: "  LAURA@Tandem.com ", password: "laura123" } }, tokenAdmin);
  assert.equal(ok.data.altaUsuario.email, "laura@tandem.com");
  assert.equal(ok.data.altaUsuario.rol, "USUARIO");
  assert.equal(codigo(await gql(Q, { e: { nombre: "Otra", email: "laura@tandem.com", password: "laura123" } }, tokenAdmin)), "CONFLICT");
  assert.equal(codigo(await gql(Q, { e: { nombre: "X", email: "a@b.com", password: "laura123" } }, tokenAdmin)), "BAD_USER_INPUT");
  assert.equal(codigo(await gql(Q, { e: { nombre: "Pepe", email: "no-es-email", password: "laura123" } }, tokenAdmin)), "BAD_USER_INPUT");
  assert.equal(codigo(await gql(Q, { e: { nombre: "Pepe", email: "pepe@b.com", password: "123" } }, tokenAdmin)), "BAD_USER_INPUT");
});

test("un usuario normal puede iniciar sesión y leer pero NO escribir", async () => {
  const l = await gql("mutation{login(email:\"laura@tandem.com\",password:\"laura123\"){token usuario{rol}}}");
  tokenUsuario = l.data.login.token;
  assert.equal(l.data.login.usuario.rol, "USUARIO");
  assert.ok((await gql("{ usuarios { id } }", {}, tokenUsuario)).data.usuarios.length >= 2);
  assert.equal(codigo(await gql(ALTA_INT, { e: NUEVO }, tokenUsuario)), "FORBIDDEN");
  assert.equal(codigo(await gql("mutation{cargarDatosDemo{usuariosCreados}}", {}, tokenUsuario)), "FORBIDDEN");
});

test("borrar usuario: funciona, 404 si no existe y no puedes borrarte a ti mismo", async () => {
  const lista = (await gql("{ usuarios { id email } }", {}, tokenAdmin)).data.usuarios;
  const admin = lista.find((u) => u.email === "admin@tandem.com");
  const laura = lista.find((u) => u.email === "laura@tandem.com");
  assert.equal(codigo(await gql("mutation($i:ID!){borrarUsuario(id:$i){id}}", { i: admin.id }, tokenAdmin)), "FORBIDDEN");
  assert.equal(codigo(await gql("mutation($i:ID!){borrarUsuario(id:$i){id}}", { i: "0".repeat(24) }, tokenAdmin)), "NOT_FOUND");
  assert.equal(codigo(await gql("mutation($i:ID!){borrarUsuario(id:$i){id}}", { i: "no-valido" }, tokenAdmin)), "BAD_USER_INPUT");
  const ok = await gql("mutation($i:ID!){borrarUsuario(id:$i){email}}", { i: laura.id }, tokenAdmin);
  assert.equal(ok.data.borrarUsuario.email, "laura@tandem.com");
});

test("alta de intercambio: guarda el tipo como texto y valida los campos", async () => {
  const r = await gql(ALTA_INT, { e: NUEVO }, tokenAdmin);
  assert.equal(r.data.altaIntercambio.tipo, "OFREZCO_IDIOMA");
  assert.equal(r.data.altaIntercambio.seleccionado, false);
  for (const mal of [{ titulo: "ab" }, { email: "x" }, { fecha: "2026-02-31" }, { fecha: "03/11/2026" }, { descripcion: "   " }, { descripcion: "x".repeat(501) }]) {
    assert.equal(codigo(await gql(ALTA_INT, { e: { ...NUEVO, ...mal } }, tokenAdmin)), "BAD_USER_INPUT", JSON.stringify(mal));
  }
  const tipoMal = await gql(ALTA_INT, { e: { ...NUEVO, tipo: "OTRO" } }, tokenAdmin);
  assert.ok(tipoMal.errors, "GraphQL rechaza un valor de enum desconocido");
});

test("datos de demo: se cargan solo si no hay intercambios y no se duplican", async () => {
  const antes = (await gql("{ intercambios { id } }", {}, tokenAdmin)).data.intercambios;
  assert.equal(antes.length, 1);
  // Con un intercambio ya guardado no se cargan los de ejemplo (igual que en el producto 2)
  const r1 = await gql("mutation{cargarDatosDemo{usuariosCreados intercambiosCreados}}", {}, tokenAdmin);
  assert.deepEqual(r1.data.cargarDatosDemo, { usuariosCreados: 3, intercambiosCreados: 0 });
  await gql("mutation($i:ID!){borrarIntercambio(id:$i){id}}", { i: antes[0].id }, tokenAdmin);
  const r2 = await gql("mutation{cargarDatosDemo{usuariosCreados intercambiosCreados}}", {}, tokenAdmin);
  assert.deepEqual(r2.data.cargarDatosDemo, { usuariosCreados: 0, intercambiosCreados: 4 });
  const r3 = await gql("mutation{cargarDatosDemo{usuariosCreados intercambiosCreados}}", {}, tokenAdmin);
  assert.deepEqual(r3.data.cargarDatosDemo, { usuariosCreados: 0, intercambiosCreados: 0 });
});

test("consultas: filtro por tipo, texto, fechas, orden y paginación", async () => {
  const Q = `query($f:FiltroIntercambios,$o:OrdenIntercambios,$l:Int,$d:Int){
    intercambios(filtro:$f,orden:$o,limite:$l,desplazamiento:$d){ titulo fecha tipo } totalIntercambios(filtro:$f) }`;
  const pedir = (v) => gql(Q, v, tokenAdmin);

  const todos = await pedir({});
  assert.equal(todos.data.totalIntercambios, 4);
  assert.deepEqual(todos.data.intercambios.map((i) => i.fecha), ["2026-11-09", "2026-11-07", "2026-11-05", "2026-11-03"]);

  const ofrezco = await pedir({ f: { tipo: "OFREZCO_IDIOMA" } });
  assert.equal(ofrezco.data.totalIntercambios, 2);
  assert.ok(ofrezco.data.intercambios.every((i) => i.tipo === "OFREZCO_IDIOMA"));

  const texto = await pedir({ f: { texto: "CATALÁN" } });
  assert.deepEqual(texto.data.intercambios.map((i) => i.titulo), ["Busco practicar catalán"]);

  const rango = await pedir({ f: { desde: "2026-11-05", hasta: "2026-11-07" } });
  assert.equal(rango.data.totalIntercambios, 2);

  const porEmail = await pedir({ f: { email: "LAURA@tandem.com" } });
  assert.equal(porEmail.data.totalIntercambios, 2);

  const asc = await pedir({ o: { campo: "FECHA", descendente: false }, l: 2, d: 1 });
  assert.deepEqual(asc.data.intercambios.map((i) => i.fecha), ["2026-11-05", "2026-11-07"]);
  assert.equal(asc.data.totalIntercambios, 4, "el total no depende de la paginación");

  // texto con símbolos de regex: se trata como texto, no como expresión
  assert.equal((await pedir({ f: { texto: ".*" } })).data.totalIntercambios, 0);

  assert.equal(codigo(await pedir({ l: 0 })), "BAD_USER_INPUT");
  assert.equal(codigo(await pedir({ l: 1000 })), "BAD_USER_INPUT");
  assert.equal(codigo(await pedir({ d: -1 })), "BAD_USER_INPUT");
  assert.equal(codigo(await pedir({ f: { desde: "2026-12-01", hasta: "2026-11-01" } })), "BAD_USER_INPUT");
});

test("selección del Dashboard: seleccionar, deseleccionar, idempotencia y borrado en cascada", async () => {
  const lista = (await gql("{ intercambios { id titulo } }", {}, tokenAdmin)).data.intercambios;
  const [a, b] = lista;
  const SEL = "mutation($i:ID!){seleccionarIntercambio(id:$i){id seleccionado}}";
  assert.equal((await gql(SEL, { i: a.id }, tokenAdmin)).data.seleccionarIntercambio.seleccionado, true);
  await gql(SEL, { i: a.id }, tokenAdmin); // repetir no duplica
  await gql(SEL, { i: b.id }, tokenAdmin);
  assert.equal(codigo(await gql(SEL, { i: "f".repeat(24) }, tokenAdmin)), "NOT_FOUND");

  const sel = await gql("{ intercambiosSeleccionados { id } intercambios { id seleccionado } }", {}, tokenAdmin);
  assert.equal(sel.data.intercambiosSeleccionados.length, 2);
  assert.equal(sel.data.intercambios.filter((i) => i.seleccionado).length, 2);

  await gql("mutation($i:ID!){deseleccionarIntercambio(id:$i){id}}", { i: b.id }, tokenAdmin);
  assert.equal((await gql("{ intercambiosSeleccionados { id } }", {}, tokenAdmin)).data.intercambiosSeleccionados.length, 1);

  // borrar un intercambio seleccionado lo quita también de la selección
  await gql("mutation($i:ID!){borrarIntercambio(id:$i){id}}", { i: a.id }, tokenAdmin);
  assert.equal((await gql("{ intercambiosSeleccionados { id } }", {}, tokenAdmin)).data.intercambiosSeleccionados.length, 0);
  assert.equal(codigo(await gql("mutation($i:ID!){borrarIntercambio(id:$i){id}}", { i: a.id }, tokenAdmin)), "NOT_FOUND");
});

test("estadísticas por mes (datos del gráfico)", async () => {
  const r = await gql("{ estadisticasPorMes { mes total ofrezco busco } }", {}, tokenAdmin);
  // Quedan 3 intercambios de noviembre 2026 (se borró uno): 1 ofrezco + 2 busco/ofrezco según la demo
  assert.equal(r.data.estadisticasPorMes.length, 1);
  const m = r.data.estadisticasPorMes[0];
  assert.equal(m.mes, "2026-11");
  assert.equal(m.total, 3);
  assert.equal(m.ofrezco + m.busco, 3);
});

test("HTTP: /salud, ruta inexistente y JSON mal formado", async () => {
  const base = url.replace("/graphql", "");
  assert.equal((await (await fetch(`${base}/salud`)).json()).estado, "ok");
  assert.equal((await fetch(`${base}/nada`)).status, 404);
  const mal = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: "{ esto no es json" });
  assert.equal(mal.status, 400);
});
