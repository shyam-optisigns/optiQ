// Temporary stub file to prevent build errors
// TODO: Remove this file after all API routes are migrated to Firebase

export const db = {
  restaurant: {
    findUnique: () => { throw new Error('Prisma DB removed - use Firebase instead') },
    update: () => { throw new Error('Prisma DB removed - use Firebase instead') },
  },
  table: {
    findFirst: () => { throw new Error('Prisma DB removed - use Firebase instead') },
    update: () => { throw new Error('Prisma DB removed - use Firebase instead') },
  },
  queueEntry: {
    findUnique: () => { throw new Error('Prisma DB removed - use Firebase instead') },
    update: () => { throw new Error('Prisma DB removed - use Firebase instead') },
    create: () => { throw new Error('Prisma DB removed - use Firebase instead') },
  }
};