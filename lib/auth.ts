import { getConnection, sql } from './db';

export interface UserValidation {
  isValid: boolean;
  userId?: string;
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
    const pool = await getConnection();
    
    // Query tblUser - Username contains the email
    const result = await pool
      .request()
      .input('uid', sql.Int, parseInt(uid))
      .input('email', sql.NVarChar, email)
      .query(`
        SELECT UserID, Username 
        FROM tblUser 
        WHERE UserID = @uid AND Username = @email
      `);

    if (result.recordset.length === 0) {
      return { isValid: false };
    }

    const user = result.recordset[0];
    return {
      isValid: true,
      userId: user.UserID.toString(),
      email: user.Username,
      isAdmin: user.Username.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
    };
  } catch (error) {
    console.error('User validation error:', error);
    return { isValid: false };
  }
}

export function isAdmin(email: string): boolean {
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
