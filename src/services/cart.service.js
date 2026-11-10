import prisma from "../config/database.js";
import { createActivity } from "./activity.service.js";
import { getRandomProductId } from "./product.service.js";
import { randomNumber } from "../utils/random.js";

async function getOrCreateCart(tx, userId) {
  let cart = await tx.cart.findUnique({ where: { userId } });
  if (!cart) {
    cart = await tx.cart.create({ data: { userId } });
  }
  return cart;
}

export async function addToCart(userId) {
  const productId = getRandomProductId();
  if (!productId) return null;

  const quantity = randomNumber(1, 3);

  return prisma.$transaction(async (tx) => {
    const cart = await getOrCreateCart(tx, userId);

    const existing = await tx.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId
        }
      }
    });

    let item;
    if (existing) {
      item = await tx.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity }
      });
    } else {
      item = await tx.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity
        }
      });
    }

    await createActivity(tx, {
      userId,
      type: "CART_ITEM_ADDED",
      entityId: item.id,
      details: {
        productId,
        quantity,
        cartId: cart.id
      }
    });

    return item;
  });
}

export async function removeFromCart(userId) {
  return prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findUnique({
      where: { userId },
      include: { items: true }
    });

    if (!cart || cart.items.length === 0) return null;

    const item = cart.items[Math.floor(Math.random() * cart.items.length)];

    await tx.cartItem.delete({ where: { id: item.id } });

    await createActivity(tx, {
      userId,
      type: "CART_ITEM_REMOVED",
      entityId: item.id,
      details: {
        productId: item.productId,
        cartId: cart.id
      }
    });

    return item;
  });
}

export async function clearCart(userId) {
  return prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findUnique({ where: { userId } });
    if (!cart) return null;

    const deleted = await tx.cartItem.deleteMany({
      where: { cartId: cart.id }
    });

    await createActivity(tx, {
      userId,
      type: "CART_CLEARED",
      entityId: cart.id,
      details: {
        cartId: cart.id,
        itemsRemoved: deleted.count
      }
    });

    return cart;
  });
}
