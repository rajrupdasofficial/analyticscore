import prisma from "../config/database.js";
import { CONFIG } from "../config/simulation.config.js";
import { sleep } from "../utils/sleep.js";

export async function getDatabaseSize() {
  const result = await prisma.$queryRaw`
    SELECT pg_database_size(current_database()) AS size
  `;
  return BigInt(result[0].size);
}

export async function checkDatabaseCapacity() {
  const currentSize = await getDatabaseSize();
  const limit = CONFIG.MAX_DATABASE_BYTES;
  const percentage = Number((currentSize * 10000n) / limit) / 100;

  return {
    currentBytes: currentSize.toString(),
    limitBytes: limit.toString(),
    percentage,
    exceeded: currentSize >= limit
  };
}

export async function startDatabaseMonitor(signal, onLimitReached) {
  console.log("[DB MONITOR] Started");

  while (!signal.aborted) {
    try {
      const status = await checkDatabaseCapacity();

      console.log(`[DB MONITOR] Usage: ${status.percentage}%`);

      if (status.exceeded) {
        console.error("[DB MONITOR] DATABASE LIMIT REACHED");
        onLimitReached();
        break;
      }
    } catch (error) {
      console.error("[DB MONITOR] Monitoring failed", error.message);
      onLimitReached(error);
      break;
    }

    await sleep(CONFIG.MONITOR_INTERVAL, signal);
  }

  console.log("[DB MONITOR] Stopped");
}
