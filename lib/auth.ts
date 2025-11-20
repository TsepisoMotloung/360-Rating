import prisma from './db';

export interface UserValidation {
  isValid: boolean;
  userId?: number;
  email?: string;
  isAdmin?: boolean;
  isManager?: boolean;
  managerId?: number;
}

const ADMIN_EMAIL = 'tmotloung@alliance.co.ls';

export async function validateUser(
  uid: string | null,
  email: string | null
): Promise<UserValidation> {
  if (!email) {
    return { isValid: false };
  }

  try {
    // Find all users that match the given email. The DB may already store emails normalized;
    // we match using the stored value. If you need case-insensitive matching for your MySQL
    // setup, consider normalizing emails to lowercase on ingestion or use a raw query.
    const users = await prisma.tblUser.findMany({
      where: { Username: email },
      include: {
        _count: {
          select: {
            ratingsGiven: true,
            ratingsReceived: true,
            tblUserRole: true,
            tblMain: true,
            tblPIN: true,
          },
        },
      },
    });

    if (!users || users.length === 0) {
      return { isValid: false };
    }

    // If only one user exists, return it
    if (users.length === 1) {
      const u = users[0];

      // determine admin membership from DB table if present
      let dbIsAdmin = false;
      try {
        const admins = await prisma.tblAdministrators.findMany({ where: { IsActive: 1 } });
        const canonical = (u.Username || email || '').toLowerCase();
        const match = admins.find((a) => (a.Username || '').toLowerCase() === canonical);
        if (match) dbIsAdmin = true;
        else {
          const anyAdmins = admins.length;
          if (anyAdmins === 0) {
            dbIsAdmin = (u.Username || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();
          }
        }
      } catch (err) {
        console.warn('Could not query tblAdministrators, falling back to ADMIN_EMAIL:', err);
        dbIsAdmin = (u.Username || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();
      }

      // Check if user is a manager
      let isManager = false;
      let managerId: number | undefined;
      try {
        const manager = await prisma.manager.findUnique({
          where: { email: (u.Username || '').toLowerCase() },
        });
        if (manager && manager.isActive) {
          isManager = true;
          managerId = manager.id;
        }
      } catch (err) {
        console.warn('Could not query Manager table:', err);
      }

      return {
        isValid: true,
        userId: u.UserID,
        email: u.Username || email,
        isAdmin: dbIsAdmin,
        isManager,
        managerId,
      };
    }

    // Multiple users with same email -> pick the one with the most related activity
    // Score activity by summing related record counts
    const parsedUid = uid ? parseInt(uid) : NaN;

    let best = users[0];
    let bestScore =
      (best._count.ratingsGiven || 0) +
      (best._count.ratingsReceived || 0) +
      (best._count.tblUserRole || 0) +
      (best._count.tblMain || 0) +
      (best._count.tblPIN || 0);

    for (const u of users) {
      const score =
        (u._count.ratingsGiven || 0) +
        (u._count.ratingsReceived || 0) +
        (u._count.tblUserRole || 0) +
        (u._count.tblMain || 0) +
        (u._count.tblPIN || 0);

      if (score > bestScore) {
        best = u;
        bestScore = score;
      }
    }

    // If parsedUid matches one of the users and that user has activity, prefer it
    if (!isNaN(parsedUid)) {
      const match = users.find((x) => x.UserID === parsedUid);
      if (match) {
        const matchScore =
          (match._count.ratingsGiven || 0) +
          (match._count.ratingsReceived || 0) +
          (match._count.tblUserRole || 0) +
          (match._count.tblMain || 0) +
          (match._count.tblPIN || 0);
        if (matchScore >= bestScore) {
          best = match;
          bestScore = matchScore;
        }
      }
    }

    // determine admin membership from DB table if present
    let dbIsAdmin = false;
    try {
      const admins = await prisma.tblAdministrators.findMany({ where: { IsActive: 1 } });
      const canonical = (best.Username || email || '').toLowerCase();
      const match = admins.find((a) => (a.Username || '').toLowerCase() === canonical);
      if (match) {
        dbIsAdmin = true;
      } else if (admins.length === 0) {
        // no admins defined in DB yet — preserve legacy single-email admin behavior
        dbIsAdmin = (best.Username || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();
      }
    } catch (err) {
      console.warn('Could not query tblAdministrators, falling back to ADMIN_EMAIL:', err);
      dbIsAdmin = (best.Username || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();
    }

    // Check if user is a manager
    let isManager = false;
    let managerId: number | undefined;
    try {
      const manager = await prisma.manager.findUnique({
        where: { email: (best.Username || '').toLowerCase() },
      });
      if (manager && manager.isActive) {
        isManager = true;
        managerId = manager.id;
      }
    } catch (err) {
      console.warn('Could not query Manager table:', err);
    }

    return {
      isValid: true,
      userId: best.UserID,
      email: best.Username || email,
      isAdmin: dbIsAdmin,
      isManager,
      managerId,
    };
  } catch (error) {
    console.error('User validation error:', error);
    return { isValid: false };
  }
}

export function isAdmin(email: string): boolean {
  // synchronous helper: only checks the legacy ADMIN_EMAIL.
  // Prefer calling `validateUser` which now uses the `tblAdministrators` table.
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}