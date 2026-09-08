import { PrismaClient } from "@prisma/client";
import { isD1RuntimeEnabled } from "./d1/runtime";
import { isMigrationMaintenance } from "./d1/maintenance";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const client =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;

export const prisma = client.$extends({
  query: {
    $allModels: {
      $allOperations({ args, query }) {
        if (isMigrationMaintenance()) {
          throw new Error("Database access paused for migration");
        }
        if (isD1RuntimeEnabled()) {
          throw new Error("Legacy database access blocked while D1 runtime is enabled");
        }
        return query(args);
      },
    },
  },
});

export default prisma;
