import prisma from "../config/database.js";
import { generateProduct } from "../generators/product.generator.js";
import { randomItem } from "../utils/random.js";
import { createActivity } from "./activity.service.js";

const productPool = [];
const productIndex = new Map();

function addToPool(id) {
  if (productIndex.has(id)) return;
  productIndex.set(id, productPool.length);
  productPool.push(id);
}

function removeFromPool(id) {
  const index = productIndex.get(id);
  if (index === undefined) return;

  const lastId = productPool[productPool.length - 1];
  productPool[index] = lastId;
  productIndex.set(lastId, index);
  productPool.pop();
  productIndex.delete(id);
}

export async function initializeProductPool() {
  const products = await prisma.product.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true }
  });

  productPool.length = 0;
  productIndex.clear();

  for (const product of products) addToPool(product.id);

  console.log(`[PRODUCT POOL] Loaded ${productPool.length} products`);
}

export function getRandomProductId() {
  return randomItem(productPool);
}

export async function createProduct(userId) {
  const data = generateProduct();

  const product = await prisma.$transaction(async tx => {
    const created = await tx.product.create({ data });

    await createActivity(tx, {
      userId,
      type: "PRODUCT_CREATED",
      entityId: created.id,
      details: {
        name: created.name,
        price: created.price.toString(),
        stock: created.stock
      }
    });

    return created;
  });

  addToPool(product.id);
  return product;
}

export async function readProduct(userId) {
  const id = getRandomProductId();
  if (!id) return null;

  return prisma.$transaction(async tx => {
    const product = await tx.product.findFirst({
      where: { id, isActive: true, deletedAt: null }
    });

    if (!product) return null;

    await createActivity(tx, {
      userId,
      type: "PRODUCT_READ",
      entityId: product.id,
      details: {
        name: product.name,
        price: product.price.toString(),
        stock: product.stock
      }
    });

    return product;
  });
}

export async function updateProduct(userId) {
  const id = getRandomProductId();
  if (!id) return null;

  const generated = generateProduct();

  return prisma.$transaction(async tx => {
    const result = await tx.product.updateMany({
      where: { id, isActive: true, deletedAt: null },
      data: {
        name: generated.name,
        description: generated.description,
        category: generated.category,
        price: generated.price
      }
    });

    if (!result.count) return null;

    const product = await tx.product.findUnique({ where: { id } });

    await createActivity(tx, {
      userId,
      type: "PRODUCT_UPDATED",
      entityId: id,
      details: {
        name: product.name,
        price: product.price.toString()
      }
    });

    return product;
  });
}

export async function deleteProduct(userId) {
  const id = getRandomProductId();
  if (!id) return null;

  const result = await prisma.$transaction(async tx => {
    const product = await tx.product.findFirst({
      where: { id, isActive: true, deletedAt: null }
    });

    if (!product) return null;

    await tx.product.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() }
    });

    await createActivity(tx, {
      userId,
      type: "PRODUCT_DELETED",
      entityId: id,
      details: {
        name: product.name,
        reason: "SIMULATED_SOFT_DELETE"
      }
    });

    return product;
  });

  if (result) removeFromPool(id);
  return result;
}
