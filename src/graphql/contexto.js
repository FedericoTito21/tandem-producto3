// src/graphql/contexto.js
// El "contexto" se crea en CADA petición: quién es el usuario (según el token) y los servicios.

/**
 * Crea la función que Apollo llama en cada petición.
 * @param {object} servicios
 * @returns {Function}
 */
export function crearContexto(servicios) {
  return async ({ req }) => {
    const cabecera = req.headers.authorization ?? "";
    const token = cabecera.startsWith("Bearer ") ? cabecera.slice(7).trim() : undefined;
    let seleccionados = null;
    return {
      servicios,
      usuario: servicios.auth.verificar(token),
      /** Ids seleccionados, cargados como mucho una vez por petición. */
      async idsSeleccionados() {
        seleccionados ??= servicios.intercambios.idsSeleccionados().then((ids) => new Set(ids));
        return seleccionados;
      },
    };
  };
}
