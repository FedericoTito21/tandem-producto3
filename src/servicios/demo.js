// src/servicios/demo.js
// iniciarDatosDemo() del producto 2: carga datos de ejemplo (solo si no hay ya datos de ese tipo).

const USUARIOS_DEMO = [
  { nombre: "Laura Puig", email: "laura@tandem.com", password: "laura123" },
  { nombre: "John Smith", email: "john@tandem.com", password: "john1234" },
  { nombre: "Aya Tanaka", email: "aya@tandem.com", password: "aya12345" },
];

const INTERCAMBIOS_DEMO = [
  { titulo: "Conversación en inglés los martes", email: "john@tandem.com", fecha: "2026-11-03",
    descripcion: "Practico inglés una hora por videollamada a cambio de practicar español.", tipo: "Ofrezco idioma" },
  { titulo: "Busco practicar catalán", email: "aya@tandem.com", fecha: "2026-11-05",
    descripcion: "Quedada semanal para hablar catalán en un ambiente relajado.", tipo: "Busco idioma" },
  { titulo: "Intercambio español-inglés en la biblioteca", email: "laura@tandem.com", fecha: "2026-11-07",
    descripcion: "Sesiones de 45 minutos. Se necesita un nivel mínimo B1 de inglés.", tipo: "Ofrezco idioma" },
  { titulo: "Quiero perder el miedo a hablar inglés", email: "laura@tandem.com", fecha: "2026-11-09",
    descripcion: "Busco a alguien paciente para charlar por videollamada dos veces por semana.", tipo: "Busco idioma" },
];

/**
 * @param {object} usuarios
 * @param {object} intercambios
 */
export function crearServicioDemo(usuarios, intercambios) {
  return {
    /**
     * Crea los usuarios e intercambios de ejemplo que falten.
     * @returns {Promise<{usuariosCreados: number, intercambiosCreados: number}>}
     */
    async cargar() {
      let usuariosCreados = 0;
      const existentes = new Set((await usuarios.listar()).map((u) => u.email));
      for (const u of USUARIOS_DEMO) {
        if (existentes.has(u.email)) continue;
        await usuarios.alta(u);
        usuariosCreados++;
      }
      let intercambiosCreados = 0;
      if ((await intercambios.total({})) === 0) {
        for (const i of INTERCAMBIOS_DEMO) {
          await intercambios.alta(i);
          intercambiosCreados++;
        }
      }
      return { usuariosCreados, intercambiosCreados };
    },
  };
}
