import prisma from './db';

export interface UserValidation {
  isValid: boolean;
  userId?: number;
  email?: string;
  isAdmin?: boolean;
}

const ADMIN_EMAIL = 'tmotloung@alliance.co.ls';

export async function validateUser(
  uid: string | null,
  email: string | null
): Promise<UserValidation> {
  if (!uid || !email) {
    return { isValid: false };
  }

  try {
    const userId = parseInt(uid);
    
    if (isNaN(userId)) {
      return { isValid: false };
    }

    // Query tblUser using Prisma - Username contains the email
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        username: email,
      },
      select: {
        id: true,
        username: true,
      },
    });

    if (!user) {
      return { isValid: false };
    }

    return {
      isValid: true,
      userId: user.id,
      email: user.username,
      isAdmin: user.username.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
    };
  } catch (error) {
    console.error('User validation error:', error);
    return { isValid: false };
  }
}

export function isAdmin(email: string): boolean {
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}