import "dotenv/config";

function positiveNumber(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return value;
}

export const CONFIG = {
  PORT: positiveNumber("PORT", 5000),
  USERS: positiveNumber("SIMULATION_USERS", 500),
  INITIAL_USERS: positiveNumber("INITIAL_USERS", 500),
  INITIAL_PRODUCTS: positiveNumber("INITIAL_PRODUCTS", 50000),

  MIN_DELAY: positiveNumber("WORKER_MIN_DELAY_MS", 100),
  MAX_DELAY: positiveNumber("WORKER_MAX_DELAY_MS", 1500),

  RESTOCK_INTERVAL: positiveNumber("RESTOCK_INTERVAL_MS", 30000),

  MAX_DATABASE_BYTES: BigInt(
    Math.floor(positiveNumber("DB_MAX_SIZE_GB", 10) * 1024 ** 3)
  ),

  RESTOCK_AMOUNT_MIN: 50,
  RESTOCK_AMOUNT_MAX: 300,
  PRODUCT_BATCH_SIZE: 1000,
  USER_BATCH_SIZE: 500,
  MAX_RESTOCK_BATCH: 200,
  MONITOR_INTERVAL: 60000
};

if (CONFIG.MIN_DELAY > CONFIG.MAX_DELAY) {
  throw new Error("WORKER_MIN_DELAY_MS cannot exceed WORKER_MAX_DELAY_MS");
}

if (CONFIG.USERS > CONFIG.INITIAL_USERS) {
  throw new Error("SIMULATION_USERS cannot exceed INITIAL_USERS");
}
