import prisma from "./prisma.js"

/**
 * Executes a minimal database query to check connectivity.
 * @returns boolean indicating if the database is reachable.
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1;`
    return true
  } catch (error) {
    // Log error internally, but don't expose it to the client
    console.error('Database health check failed:', error)
    return false
  }
}
