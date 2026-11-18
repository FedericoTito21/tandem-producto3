// src/utils/validacion.js
// Validaciones del servidor (las mismas reglas que el frontend del producto 2, pero aquí NO se pueden saltar).
import { datosInvalidos } from "./errores.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const NOMBRE_RE = /^[\p{L}][\p{L}\s'’-]*$/u;
const ID_RE = /^[a-f0-9]{24}$/i;

/**
 * Quita espacios y exige que sea texto.
 * @param {unknown} valor
 * @param {string} campo Nombre del campo (para el mensaje de error).
 * @returns {string}
 */
export function texto(valor, campo) {
  if (typeof valor !== "string") throw datosInvalidos(`El campo "${campo}" es obligatorio.`, campo);
  return valor.trim();
}

/**
 * Comprueba que el texto tiene entre min y max caracteres.
 * @param {string} valor
 * @param {string} campo
 * @param {number} min
 * @param {number} max
 * @returns {string} El mismo valor.
 */
export function longitud(valor, campo, min, max) {
  if (valor.length < min || valor.length > max) {
    throw datosInvalidos(`El campo "${campo}" debe tener entre ${min} y ${max} caracteres.`, campo);
  }
  return valor;
}

/**
 * Valida y normaliza (minúsculas) un email.
 * @param {unknown} valor
 * @returns {string}
 */
export function email(valor) {
  const v = texto(valor, "email").toLowerCase();
  if (!EMAIL_RE.test(v) || v.length > 120) throw datosInvalidos("El email no es válido.", "email");
  return v;
}

/**
 * Valida un nombre de persona (letras, espacios, apóstrofo y guion; 2-50 caracteres).
 * @param {unknown} valor
 * @returns {string}
 */
export function nombre(valor) {
  const v = longitud(texto(valor, "nombre"), "nombre", 2, 50);
  if (!NOMBRE_RE.test(v)) throw datosInvalidos("El nombre solo puede contener letras, espacios, ' y -.", "nombre");
  return v;
}

/**
 * Valida una contraseña (6-72 caracteres; 72 es el límite de bcrypt).
 * @param {unknown} valor
 * @returns {string}
 */
export function password(valor) {
  if (typeof valor !== "string") throw datosInvalidos('El campo "password" es obligatorio.', "password");
  return longitud(valor, "password", 6, 72);
}

/**
 * Valida una fecha AAAA-MM-DD que exista de verdad (rechaza 2026-02-31).
 * @param {unknown} valor
 * @returns {string}
 */
export function fecha(valor) {
  const v = texto(valor, "fecha");
  const d = new Date(`${v}T00:00:00Z`);
  if (!FECHA_RE.test(v) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) {
    throw datosInvalidos("La fecha debe tener formato AAAA-MM-DD y existir.", "fecha");
  }
  return v;
}

/**
 * Comprueba que un id tiene forma de ObjectId de MongoDB (24 caracteres hexadecimales).
 * @param {unknown} valor
 * @returns {string}
 */
export function idMongo(valor) {
  if (typeof valor !== "string" || !ID_RE.test(valor)) throw datosInvalidos("El id no es válido.", "id");
  return valor;
}

/**
 * Escapa un texto para usarlo dentro de una expresión regular (evita inyección de regex).
 * @param {string} s
 * @returns {string}
 */
export function escaparRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
