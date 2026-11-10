import prisma from "../config/database.js";
import { generateUser } from "../generators/user.generator.js";
import { randomItem } from "../utils/random.js";
import { createActivity } from "./activity.service.js";

const activeUsers = [];
const protectedUsers = new Set();
const userIndex = new Map();
const nonWorkerUsers = [];
const nonWorkerIndex = new Map();

function addUser(id) {
  if (userIndex.has(id)) return;
  userIndex.set(id, activeUsers.length);
  activeUsers.push(id);
}

function removeFromNonWorkerPool(id) {
  const index = nonWorkerIndex.get(id);
  if (index === undefined) return;

  const lastId = nonWorkerUsers[nonWorkerUsers.length - 1];
  nonWorkerUsers[index] = lastId;
  nonWorkerIndex.set(lastId, index);
  nonWorkerUsers.pop();
  nonWorkerIndex.delete(id);
}

function removeUser(id) {
  const index = userIndex.get(id);
  if (index === undefined) return;

  const lastId = activeUsers[activeUsers.length - 1];
  activeUsers[index] = lastId;
  userIndex.set(lastId, index);
  activeUsers.pop();
  userIndex.delete(id);

  removeFromNonWorkerPool(id);
}

function addNonWorker(id) {
  if (nonWorkerIndex.has(id)) return;
  nonWorkerIndex.set(id, nonWorkerUsers.length);
  nonWorkerUsers.push(id);
}

export async function initializeUserPool() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true },
    orderBy: { createdAt: "asc" }
  });

  activeUsers.length = 0;
  nonWorkerUsers.length = 0;
  protectedUsers.clear();
  userIndex.clear();
  nonWorkerIndex.clear();

  for (const user of users) addUser(user.id);

  const workerIds = users.slice(0, 500).map(user => user.id);

  for (const id of workerIds) protectedUsers.add(id);

  for (const user of users) {
    if (!protectedUsers.has(user.id)) addNonWorker(user.id);
  }

  console.log(`[USER POOL] Loaded ${activeUsers.length} users`);
  return workerIds;
}

export function getRandomUserId() {
  return randomItem(activeUsers);
}

export function getRandomNonWorkerUserId() {
  return randomItem(nonWorkerUsers);
}

export async function createUser() {
  const data = generateUser();

  const user = await prisma.$transaction(async tx => {
    const created = await tx.user.create({ data });

    await createActivity(tx, {
      userId: created.id,
      type: "USER_CREATED",
      entityId: created.id,
      details: { email: created.email }
    });

    return created;
  });

  addUser(user.id);
  addNonWorker(user.id);
  return user;
}

export async function readUser(userId) {
  if (!userId) return null;

  return prisma.$transaction(async tx => {
    const user = await tx.user.findFirst({
      where: { id: userId, isActive: true }
    });

    if (!user) return null;

    await createActivity(tx, {
      userId,
      type: "USER_READ",
      entityId: userId,
      details: { action: "USER_PROFILE_READ" }
    });

    return user;
  });
}

export async function updateUser(userId) {
  if (!userId) return null;

  const generated = generateUser();

  return prisma.$transaction(async tx => {
    const result = await tx.user.updateMany({
      where: { id: userId, isActive: true },
      data: {
        name: generated.name,
        phone: generated.phone
      }
    });

    if (!result.count) return null;

    const user = await tx.user.findUnique({ where: { id: userId } });

    await createActivity(tx, {
      userId,
      type: "USER_UPDATED",
      entityId: userId,
      details: {
        name: user.name,
        phone: user.phone
      }
    });

    return user;
  });
}

export async function deleteUser() {
  const userId = getRandomNonWorkerUserId();
  if (!userId) return null;

  const result = await prisma.$transaction(async tx => {
    const user = await tx.user.findFirst({
      where: { id: userId, isActive: true }
    });

    if (!user) return null;

    await tx.user.update({
      where: { id: userId },
      data: { isActive: false }
    });

    await createActivity(tx, {
      userId,
      type: "USER_DELETED",
      entityId: userId,
      details: { reason: "SIMULATED_SOFT_DELETE" }
    });

    return user;
  });

  if (result) removeUser(userId);
  return result;
}
