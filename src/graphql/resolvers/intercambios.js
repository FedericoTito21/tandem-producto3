// src/graphql/resolvers/intercambios.js
import { requiereAdmin, requiereLogin } from "../guardas.js";

/** Resolvers de los intercambios y de la selección del Dashboard. */
export const resolversIntercambios = {
  Query: {
    intercambios: (_, { filtro, orden, limite, desplazamiento }, ctx) => (
      requiereLogin(ctx), ctx.servicios.intercambios.listar({ filtro, orden, limite, desplazamiento })
    ),
    totalIntercambios: (_, { filtro }, ctx) => (requiereLogin(ctx), ctx.servicios.intercambios.total(filtro)),
    intercambio: (_, { id }, ctx) => (requiereLogin(ctx), ctx.servicios.intercambios.obtener(id)),
    intercambiosSeleccionados: (_, __, ctx) => (requiereLogin(ctx), ctx.servicios.intercambios.seleccionados()),
    estadisticasPorMes: (_, __, ctx) => (requiereLogin(ctx), ctx.servicios.intercambios.estadisticasPorMes()),
  },
  Mutation: {
    altaIntercambio: (_, { entrada }, ctx) => (requiereAdmin(ctx), ctx.servicios.intercambios.alta(entrada)),
    borrarIntercambio: (_, { id }, ctx) => (requiereAdmin(ctx), ctx.servicios.intercambios.borrar(id)),
    seleccionarIntercambio: (_, { id }, ctx) => (requiereAdmin(ctx), ctx.servicios.intercambios.seleccionar(id)),
    deseleccionarIntercambio: (_, { id }, ctx) => (requiereAdmin(ctx), ctx.servicios.intercambios.deseleccionar(id)),
    cargarDatosDemo: (_, __, ctx) => (requiereAdmin(ctx), ctx.servicios.demo.cargar()),
  },
  Intercambio: {
    id: (i) => String(i._id),
    creadoEn: (i) => i.creadoEn.toISOString(),
    // Se carga la lista de seleccionados UNA vez por petición (ctx.idsSeleccionados) aunque se pidan 100 intercambios.
    seleccionado: async (i, _, ctx) => (await ctx.idsSeleccionados()).has(String(i._id)),
  },
  // Texto guardado en MongoDB <-> valor del enum de GraphQL.
  TipoIntercambio: { OFREZCO_IDIOMA: "Ofrezco idioma", BUSCO_IDIOMA: "Busco idioma" },
  CampoOrden: { FECHA: "fecha", TITULO: "titulo", TIPO: "tipo", CREADO_EN: "creadoEn" },
};
