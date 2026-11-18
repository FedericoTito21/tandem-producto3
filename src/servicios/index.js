// src/servicios/index.js
// Monta repositorios y servicios a partir de una base de datos. Los tests usan esto con una BD falsa.
import { crearRepoUsuarios } from "../repositorios/usuarios.js";
import { crearRepoIntercambios } from "../repositorios/intercambios.js";
import { crearServicioUsuarios } from "./usuarios.js";
import { crearServicioIntercambios } from "./intercambios.js";
import { crearServicioAuth } from "./auth.js";
import { crearServicioDemo } from "./demo.js";

/**
 * @param {Db} bd
 * @param {Config} config
 * @returns {{usuarios: object, intercambios: object, auth: object, demo: object}}
 */
export function crearServicios(bd, config) {
  const repoUsuarios = crearRepoUsuarios(bd);
  const usuarios = crearServicioUsuarios(repoUsuarios);
  const intercambios = crearServicioIntercambios(crearRepoIntercambios(bd));
  const auth = crearServicioAuth(repoUsuarios, config);
  const demo = crearServicioDemo(usuarios, intercambios);
  return { usuarios, intercambios, auth, demo };
}
