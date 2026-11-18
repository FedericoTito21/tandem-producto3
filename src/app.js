// src/app.js
// Construye la aplicación Express con Apollo Server. No arranca nada: lo hace server.js (y los tests).
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { typeDefs } from "./graphql/typeDefs.js";
import { resolvers } from "./graphql/resolvers/index.js";
import { crearContexto } from "./graphql/contexto.js";

/**
 * Oculta los errores internos al cliente (se registran en el servidor) y deja pasar los controlados.
 * @param {object} formatted Error ya formateado por Apollo.
 * @param {unknown} error Error original.
 */
export function formatearError(formatted, error) {
  if (formatted.extensions?.code === "INTERNAL_SERVER_ERROR") {
    console.error("Error interno:", error);
    return { message: "Error interno del servidor.", extensions: { code: "INTERNAL_SERVER_ERROR" } };
  }
  return formatted;
}

/**
 * @param {{servicios: object, config: object, limitePorMinuto: number}} opciones
 * @returns {Promise<{app: Express, apollo: ApolloServer}>}
 */
export async function crearApp({ servicios, config, limitePorMinuto = 120 }) {
  const apollo = new ApolloServer({
    typeDefs,
    resolvers,
    formatError: formatearError,
    includeStacktraceInErrorResponses: false,
  });
  await apollo.start();

  const app = express();
  app.disable("x-powered-by");

  // Comprobación de que el servidor vive (útil para Docker y para probar rápido).
  app.get("/salud", (_req, res) => res.json({ estado: "ok" }));

  app.use(
    "/graphql",
    cors(),
    rateLimit({ windowMs: 60_000, limit: limitePorMinuto, standardHeaders: true, legacyHeaders: false }),
    express.json({ limit: "100kb" }),
    expressMiddleware(apollo, { context: crearContexto(servicios) }),
  );

  // Rutas que no existen
  app.use((_req, res) => res.status(404).json({ error: "Ruta no encontrada. El API está en POST /graphql" }));

  // Errores que se escapan (JSON mal formado, etc.)
  // eslint-disable-next-line no-unused-vars
  app.use((error, _req, res, _next) => {
    const status = error.status ?? error.statusCode ?? 500;
    if (status >= 500) console.error(error);
    res.status(status).json({ error: status >= 500 ? "Error interno del servidor." : error.message });
  });

  return { app, apollo };
}
