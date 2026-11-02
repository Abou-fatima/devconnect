const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const env = require("./config/env");

// Certains réseaux refusent les requêtes DNS SRV utilisées par mongodb+srv:// (Atlas).
// DNS_SERVERS=8.8.8.8,1.1.1.1 dans .env contourne le problème sans changer le réseau.
if (process.env.DNS_SERVERS) {
  require("dns").setServers(
    process.env.DNS_SERVERS.split(",").map((s) => s.trim()),
  );
}

env.assertValid();

const app = require("./app");
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: env.frontendUrl.split(",").map((s) => s.trim()) },
});
app.set("io", io); // les routes peuvent émettre : req.app.get('io')
require("./communication").initSockets(io); // Redis + chat Socket.IO (authentification JWT)

mongoose
  .connect(env.mongoUri)
  .then(() =>
    server.listen(env.port, () =>
      console.log(
        `API prête sur http://localhost:${env.port}  (docs : /api/docs)`,
      ),
    ),
  )
  .catch((err) => {
    console.error("Connexion MongoDB impossible :", err.message);
    process.exit(1);
  });

const stop = () =>
  server.close(() =>
    mongoose.connection.close(false).then(() => process.exit(0)),
  );
process.on("SIGTERM", stop);
process.on("SIGINT", stop);