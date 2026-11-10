import { createActivity } from "./activity.service.js";

export async function recordInventoryMovement(tx, {
  productId,
  orderId = null,
  quantity,
  type,
  reason = null,
  balanceAfter
}) {
  const movement = await tx.inventoryMovement.create({
    data: {
      productId,
      orderId,
      quantity,
      type,
      reason,
      balanceAfter
    }
  });

  await createActivity(tx, {
    userId: null,
    type: "INVENTORY_MOVED",
    entityId: movement.id,
    details: {
      productId,
      orderId,
      quantity,
      type,
      reason,
      balanceAfter
    }
  });

  return movement;
}
