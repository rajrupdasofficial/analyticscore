import prisma from "../config/database.js";
import { createActivity } from "./activity.service.js";
import { getRandomProductId } from "./product.service.js";
import { randomNumber, randomItem } from "../utils/random.js";

const TITLES = [
  "Great product!",
  "Not bad",
  "Excellent quality",
  "Could be better",
  "Highly recommended",
  "Average",
  "Love it",
  "Disappointed",
  "Worth the price",
  "Fast delivery"
];

const BODIES = [
  "Works as expected.",
  "Value for money.",
  "Fast delivery and good packaging.",
  "Quality is okay for the price.",
  "Will buy again.",
  "Packaging was good.",
  "Slightly disappointed with the quality.",
  "Exceeded my expectations.",
  "Good product overall.",
  "Not recommended."
];

export async function createReview(userId) {
  const productId = getRandomProductId();
  if (!productId) return null;

  const rating = randomNumber(1, 5);

  return prisma.$transaction(async (tx) => {
    // One review per user per product
    const existing = await tx.review.findUnique({
      where: {
        userId_productId: {
          userId,
          productId
        }
      }
    });

    if (existing) return null;

    const review = await tx.review.create({
      data: {
        userId,
        productId,
        rating,
        title: randomItem(TITLES),
        body: randomItem(BODIES)
      }
    });

    await createActivity(tx, {
      userId,
      type: "REVIEW_CREATED",
      entityId: review.id,
      details: {
        productId,
        rating,
        title: review.title
      }
    });

    return review;
  });
}
