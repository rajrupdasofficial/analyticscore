import { runUserWorker } from "./user.worker.js";
import { startRestockWorker } from "./restock.worker.js";
import { startDatabaseMonitor } from "../services/database.monitor.js";
import { initializeUserPool } from "../services/user.service.js";
import { CONFIG } from "../config/simulation.config.js";

let controller = null;
let running = false;
let stoppingPromise = null;
let workerPromises = [];
let startedAt = null;
let stoppedAt = null;
let lastError = null;

export async function startSimulation() {
  if (running) {
    return { success: false, message: "Simulation already running" };
  }

  if (stoppingPromise) {
    return { success: false, message: "Simulation is currently stopping" };
  }

  const workerIds = await initializeUserPool();

  if (workerIds.length < CONFIG.USERS) {
    throw new Error(
      `Not enough active users. Required: ${CONFIG.USERS}, found: ${workerIds.length}. Run npm run seed first.`
    );
  }

  controller = new AbortController();
  const signal = controller.signal;

  running = true;
  startedAt = new Date();
  stoppedAt = null;
  lastError = null;

  console.log(`[SIMULATION] Starting ${CONFIG.USERS} user workers`);

  const tasks = workerIds
    .slice(0, CONFIG.USERS)
    .map((userId, index) => runUserWorker(index + 1, userId, signal));

  tasks.push(startRestockWorker(signal));

  tasks.push(
    startDatabaseMonitor(signal, error => {
      lastError = error?.message || "Database capacity limit reached";
      void stopSimulation();
    })
  );

  workerPromises = tasks.map(task =>
    task.catch(error => {
      if (!signal.aborted) {
        lastError = error.message;
        console.error("[SIMULATION] Fatal worker failure", error.message);
        void stopSimulation();
      }
      throw error;
    })
  );

  void Promise.allSettled(workerPromises).then(() => {
    if (signal.aborted) {
      running = false;
      stoppedAt = new Date();
    }
  });

  return {
    success: true,
    workers: CONFIG.USERS,
    message: "Simulation started"
  };
}

export async function stopSimulation() {
  if (stoppingPromise) return stoppingPromise;

  if (!running) {
    return { success: false, message: "Simulation is not running" };
  }

  stoppingPromise = (async () => {
    console.log("[SIMULATION] Stopping...");
    controller.abort();

    await Promise.allSettled(workerPromises);

    running = false;
    stoppedAt = new Date();
    workerPromises = [];

    console.log("[SIMULATION] All workers stopped");

    return { success: true, message: "Simulation stopped" };
  })();

  try {
    return await stoppingPromise;
  } finally {
    stoppingPromise = null;
  }
}

export function getSimulationStatus() {
  return {
    running,
    configuredWorkers: CONFIG.USERS,
    backgroundWorkers: 2,
    startedAt,
    stoppedAt,
    lastError
  };
}
