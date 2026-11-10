import prisma from "../config/database.js";
import { randomNumber } from "../utils/random.js";
import { CONFIG } from "../config/simulation.config.js";
import { createActivity } from "./activity.service.js";
import { recordInventoryMovement } from "./inventory.service.js";

export async function replenishStock() {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      stock: { lte: 30 }
    },
    select: {
      id: true,
      name: true,
      stock: true,
      minStock: true
    },
    orderBy: { stock: "asc" },
    take: CONFIG.MAX_RESTOCK_BATCH
  });

  let replenished = 0;

  for (const product of products) {
    const quantity = randomNumber(
      CONFIG.RESTOCK_AMOUNT_MIN,
      CONFIG.RESTOCK_AMOUNT_MAX
    );

    await prisma.$transaction(async (tx) => {
      const result = await tx.product.updateMany({
        where: {
          id: product.id,
          isActive: true,
          deletedAt: null,
          stock: { lte: product.minStock }
        },
        data: {
          stock: { increment: quantity }
        }
      });

      if (!result.count) return;

      const updated = await tx.product.findUnique({
        where: { id: product.id },
        select: { stock: true }
      });

      await recordInventoryMovement(tx, {
        productId: product.id,
        orderId: null,
        quantity: quantity,
        type: "RESTOCK",
        reason: "AUTOMATIC_RESTOCK",
        balanceAfter: updated.stock
      });

      await createActivity(tx, {
        type: "STOCK_RESTOCKED",
        entityId: product.id,
        details: {
          productName: product.name,
          previouslyObservedStock: product.stock,
          replenishedQuantity: quantity,
          reason: "AUTOMATIC_LOW_STOCK"
        }
      });

      replenished++;
    });
  }

  if (replenished > 0) {
    console.log(`[RESTOCK] ${replenished} products replenished`);
  }

  return replenished;
}
