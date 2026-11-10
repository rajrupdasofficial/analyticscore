import "dotenv/config";
import prisma from "../config/database.js";
import { CONFIG } from "../config/simulation.config.js";
import { generateUser } from "../generators/user.generator.js";
import { generateProduct } from "../generators/product.generator.js";

async function seedUsers() {
  console.log("[SEED] Checking users...");

  const existing = await prisma.user.count();
  const missing = Math.max(0, CONFIG.INITIAL_USERS - existing);

  console.log(`[SEED] Existing users: ${existing}`);
  console.log(`[SEED] New users required: ${missing}`);

  for (let i = 0; i < missing; i += CONFIG.USER_BATCH_SIZE) {
    const size = Math.min(CONFIG.USER_BATCH_SIZE, missing - i);
    const batch = Array.from({ length: size }, () => generateUser());

    await prisma.user.createMany({
      data: batch,
      skipDuplicates: true
    });

    console.log(`[SEED] Users processed: ${i + size}/${missing}`);
  }
}

async function seedProducts() {
  console.log("[SEED] Checking products...");

  const existing = await prisma.product.count();
  const missing = Math.max(0, CONFIG.INITIAL_PRODUCTS - existing);

  console.log(`[SEED] Existing products: ${existing}`);
  console.log(`[SEED] New products required: ${missing}`);

  for (let i = 0; i < missing; i += CONFIG.PRODUCT_BATCH_SIZE) {
    const size = Math.min(CONFIG.PRODUCT_BATCH_SIZE, missing - i);
    const batch = Array.from({ length: size }, () => generateProduct());

    await prisma.product.createMany({
      data: batch,
      skipDuplicates: true
    });

    console.log(`[SEED] Products processed: ${i + size}/${missing}`);
  }
}

async function main() {
  try {
    console.log("==============================");
    console.log("ECOMMERCE DATABASE SEEDING");
    console.log("==============================");

    await prisma.$connect();
    await seedUsers();
    await seedProducts();

    console.log("==============================");
    console.log("DATABASE SEEDING COMPLETED");
    console.log("==============================");
  } catch (error) {
    console.error("[SEED ERROR]", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
