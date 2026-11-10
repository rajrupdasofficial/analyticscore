import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["error"],
  transactionOptions: {
     maxWait: 15000,
     timeout: 30000
   }
});

export default prisma;
