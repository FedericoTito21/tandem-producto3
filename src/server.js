// src/server.js
// Punto de entrada: npm start
import { config, validarConfig } from "./config/entorno.js";
import { conectar, desconectar } from "./db/conexion.js";
import { crearServicios } from "./servicios/index.js";
import { crearApp } from "./app.js";

async function arrancar() {
  validarConfig(config);
  const bd = await conectar(config);
  console.log(`MongoDB conectado (base de datos "${config.nombreBD}")`);

  const servicios = crearServicios(bd, config);
  if (await servicios.auth.asegurarAdmin(servicios.usuarios)) {
    console.log(`Administrador creado: ${config.adminEmail}`);
  }

  const { app, apollo } = await crearApp({ servicios, config });
  const servidor = app.listen(config.puerto, () => {
    console.log(`API GraphQL lista en http://localhost:${config.puerto}/graphql`);
  });

  // Apagado ordenado (Ctrl+C o parada de Docker)
  const apagar = async () => {
    servidor.close();
    await apollo.stop();
    await desconectar();
    process.exit(0);
  };
  process.on("SIGINT", apagar);
  process.on("SIGTERM", apagar);
}

arrancar().catch((error) => {
  console.error("No se pudo arrancar:", error.message);
  process.exit(1);
});
