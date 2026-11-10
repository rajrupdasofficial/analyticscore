import { replenishStock } from "../services/stock.service.js";
import { CONFIG } from "../config/simulation.config.js";
import { sleep } from "../utils/sleep.js";

export async function startRestockWorker(signal) {
  console.log("[RESTOCK WORKER] Started");

  while (!signal.aborted) {
    await replenishStock();
    await sleep(CONFIG.RESTOCK_INTERVAL, signal);
  }

  console.log("[RESTOCK WORKER] Stopped");
}
