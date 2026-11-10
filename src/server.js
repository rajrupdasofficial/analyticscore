import "dotenv/config";
import express from "express";
import prisma from "./config/database.js";
import { CONFIG } from "./config/simulation.config.js";
import { initializeProductPool } from "./services/product.service.js";
import { initializeUserPool } from "./services/user.service.js";
import {
  startController,
  stopController,
  statusController
} from "./controllers/simulation.controller.js";
import {
  stopSimulation,
  getSimulationStatus
} from "./workers/worker.manager.js";

const app = express();
let server;
let shuttingDown = false;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    application: "E-commerce Simulation Engine",
    status: "Online",
    workers: CONFIG.USERS
  });
});

app.get("/simulation/status", statusController);
app.post("/simulation/start", startController);
app.post("/simulation/stop", stopController);

app.use((error, req, res, next) => {
  console.error("[EXPRESS ERROR]", error);
  res.status(500).json({
    success: false,
    message: "Internal server error"
  });
});

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`\n[SERVER] Received ${signal}`);

  try {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }

    if (getSimulationStatus().running) {
      await stopSimulation();
    }

    await prisma.$disconnect();
    console.log("[SERVER] Shutdown complete");
  } catch (error) {
    console.error("[SERVER] Shutdown failed", error);
    process.exitCode = 1;
  }
}

async function main() {
  try {
    await prisma.$connect();
    console.log("[SERVER] PostgreSQL connected");

    await initializeProductPool();
    await initializeUserPool();

    server = app.listen(CONFIG.PORT, "127.0.0.1", () => {
      console.log(`[SERVER] Listening at http://127.0.0.1:${CONFIG.PORT}`);
      console.log("[SERVER] Ready to start simulation");
    });
  } catch (error) {
    console.error("[SERVER] Startup failed", error);
    await prisma.$disconnect();
    process.exitCode = 1;
  }
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

main();
