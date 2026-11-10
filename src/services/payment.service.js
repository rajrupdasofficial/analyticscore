import { Prisma } from "@prisma/client";
import { createActivity } from "./activity.service.js";
import { randomItem, randomNumber } from "../utils/random.js";

const METHODS = ["CARD", "UPI", "NET_BANKING", "WALLET", "COD"];

export async function createPayment(tx, { orderId, amount, userId }) {
  const method = randomItem(METHODS);
  const success = Math.random() > 0.08;

  const payment = await tx.payment.create({
    data: {
      orderId,
      amount: new Prisma.Decimal(amount.toString()),
      method,
      status: success ? "SUCCESS" : "FAILED",
      transactionId: success
        ? `TXN-${Date.now()}-${randomNumber(1000, 9999)}`
        : null,
      failureReason: success ? null : "SIMULATED_PAYMENT_DECLINED",
      paidAt: success ? new Date() : null
    }
  });

  await createActivity(tx, {
    userId,
    type: success ? "PAYMENT_SUCCESS" : "PAYMENT_FAILED",
    entityId: payment.id,
    details: {
      orderId,
      amount: amount.toString(),
      method,
      status: payment.status,
      transactionId: payment.transactionId
    }
  });

  return payment;
}
