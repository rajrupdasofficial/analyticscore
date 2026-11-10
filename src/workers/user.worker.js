import {
  createProduct,
  readProduct,
  updateProduct,
  deleteProduct
} from "../services/product.service.js";

import {
  createUser,
  readUser,
  updateUser,
  deleteUser,
  getRandomUserId
} from "../services/user.service.js";

import { purchaseProduct } from "../services/purchase.service.js";
import { addToCart, removeFromCart, clearCart } from "../services/cart.service.js";
import { createReview } from "../services/review.service.js";

import { randomWeighted, randomNumber } from "../utils/random.js";
import { sleep } from "../utils/sleep.js";
import { CONFIG } from "../config/simulation.config.js";
import { isFatalDatabaseError } from "../utils/errors.js";

const operations = [
  { value: "READ_PRODUCT", weight: 30 },
  { value: "PURCHASE", weight: 18 },
  { value: "ADD_TO_CART", weight: 12 },
  { value: "UPDATE_PRODUCT", weight: 8 },
  { value: "CREATE_PRODUCT", weight: 5 },
  { value: "CREATE_REVIEW", weight: 7 },
  { value: "REMOVE_FROM_CART", weight: 4 },
  { value: "CLEAR_CART", weight: 2 },
  { value: "DELETE_PRODUCT", weight: 2 },
  { value: "READ_USER", weight: 4 },
  { value: "UPDATE_USER", weight: 3 },
  { value: "CREATE_USER", weight: 2 },
  { value: "DELETE_USER", weight: 1 }
];

export async function runUserWorker(workerId, userId, signal) {
  console.log(`[WORKER ${workerId}] Started`);

  while (!signal.aborted) {
    try {
      const operation = randomWeighted(operations);

      switch (operation) {
        case "READ_PRODUCT":
          await readProduct(userId);
          break;
        case "PURCHASE":
          await purchaseProduct(userId);
          break;
        case "ADD_TO_CART":
          await addToCart(userId);
          break;
        case "REMOVE_FROM_CART":
          await removeFromCart(userId);
          break;
        case "CLEAR_CART":
          await clearCart(userId);
          break;
        case "CREATE_REVIEW":
          await createReview(userId);
          break;
        case "UPDATE_PRODUCT":
          await updateProduct(userId);
          break;
        case "CREATE_PRODUCT":
          await createProduct(userId);
          break;
        case "DELETE_PRODUCT":
          await deleteProduct(userId);
          break;
        case "READ_USER": {
          const targetUser = getRandomUserId();
          if (targetUser) await readUser(targetUser);
          break;
        }
        case "UPDATE_USER":
          await updateUser(userId);
          break;
        case "CREATE_USER":
          await createUser();
          break;
        case "DELETE_USER":
          await deleteUser();
          break;
      }
    } catch (error) {
      if (isFatalDatabaseError(error)) {
        console.error(`[WORKER ${workerId}] Fatal error`, error.message);
        throw error;
      }
      console.error(`[WORKER ${workerId}] Operation failed`, error.message);
    }

    await sleep(
      randomNumber(CONFIG.MIN_DELAY, CONFIG.MAX_DELAY),
      signal
    );
  }

  console.log(`[WORKER ${workerId}] Stopped`);
}
