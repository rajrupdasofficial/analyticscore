import prisma from "../config/database.js";
import { Prisma } from "@prisma/client";
import { getRandomProductId } from "./product.service.js";
import { randomNumber } from "../utils/random.js";
import { createActivity } from "./activity.service.js";
import { recordInventoryMovement } from "./inventory.service.js";
import { createPayment } from "./payment.service.js";

export async function purchaseProduct(userId) {
  const productId = getRandomProductId();
  if (!productId) return null;

  const quantity = randomNumber(1, 5);

  return prisma.$transaction(async (tx) => {
    const deduction = await tx.product.updateMany({
      where: {
        id: productId,
        isActive: true,
        deletedAt: null,
        stock: { gte: quantity }
      },
      data: {
        stock: { decrement: quantity }
      }
    });

    if (deduction.count === 0) {
      await createActivity(tx, {
        userId,
        type: "PURCHASE_FAILED",
        entityId: productId,
        details: {
          reason: "INSUFFICIENT_STOCK",
          requestedQuantity: quantity
        }
      });

      return { success: false, reason: "OUT_OF_STOCK" };
    }

    const product = await tx.product.findUnique({
      where: { id: productId }
    });

    const unitPrice = new Prisma.Decimal(product.price.toString());
    const subtotal = unitPrice.mul(quantity);

    const order = await tx.order.create({
      data: {
        userId,
        totalAmount: subtotal,
        status: "COMPLETED",
        items: {
          create: {
            productId,
            quantity,
            unitPrice,
            subtotal
          }
        }
      }
    });

    await recordInventoryMovement(tx, {
      productId,
      orderId: order.id,
      quantity: -quantity,
      type: "SALE",
      reason: "PURCHASE",
      balanceAfter: product.stock
    });

    await createPayment(tx, {
      orderId: order.id,
      amount: subtotal,
      userId
    });

    await createActivity(tx, {
      userId,
      type: "PURCHASE_SUCCESS",
      entityId: order.id,
      details: {
        productId,
        productName: product.name,
        quantity,
        unitPrice: unitPrice.toString(),
        subtotal: subtotal.toString(),
        remainingStock: product.stock
      }
    });

    return {
      success: true,
      orderId: order.id,
      productId,
      quantity,
      total: subtotal.toString(),
      remainingStock: product.stock
    };
  }, {
    maxWait: 30000,
    timeout: 30000
  });
}
