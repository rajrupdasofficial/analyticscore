import prisma from "../config/database.js";

const BATCH = 200;

async function backfillSales() {
  console.log("Starting inventory movement backfill...");

  // First check how many orders exist
  const totalOrders = await prisma.order.count();
  console.log(`Total orders in database: ${totalOrders}`);

  if (totalOrders === 0) {
    console.log("No orders found. Nothing to backfill.");
    return;
  }

  let cursor = null;
  let processed = 0;
  let created = 0;
  let skipped = 0;

  while (true) {
    const orders = await prisma.order.findMany({
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      include: {
        items: true
      }
    });

    if (orders.length === 0) break;

    for (const order of orders) {
      for (const item of order.items) {
        // Check if movement already exists
        const exists = await prisma.inventoryMovement.findFirst({
          where: {
            orderId: order.id,
            productId: item.productId,
            type: "SALE"
          }
        });

        if (exists) {
          skipped++;
          continue;
        }

        await prisma.inventoryMovement.create({
          data: {
            productId: item.productId,
            orderId: order.id,
            quantity: -item.quantity,   // negative = stock went down
            type: "SALE",
            reason: "BACKFILL",
            balanceAfter: 0             // historical balance unknown
          }
        });

        created++;
      }
      processed++;
    }

    cursor = orders[orders.length - 1].id;
    console.log(
      `Progress → Orders processed: ${processed} | Movements created: ${created} | Skipped: ${skipped}`
    );

    // Small pause so we don’t hammer the DB
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log("========================================");
  console.log("Backfill finished");
  console.log(`Orders processed : ${processed}`);
  console.log(`Movements created: ${created}`);
  console.log(`Already existed  : ${skipped}`);
  console.log("========================================");
}

backfillSales()
  .catch((err) => {
    console.error("Backfill failed:");
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("Disconnected from database");
  });
