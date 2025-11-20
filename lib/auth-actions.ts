'use server';

import { validateUser } from './auth';

export async function validateUserServer(uid: string, email: string) {
  try {
    const validation = await validateUser(uid, email);
    return validation;
  } catch (error) {
    console.error('Server validation error:', error);
    return { isValid: false };
  }
}
