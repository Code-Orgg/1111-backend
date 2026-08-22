const { PrismaClient } = require("@prisma/client");

// Reuse a single client instance (avoids exhausting DB connections in dev/hot-reload)
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

module.exports = prisma;
