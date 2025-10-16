/**
 * Generates a random salt string of a given length.
 * @param length The length of the salt in bytes. Defaults to 16.
 * @returns A hexadecimal string representation of the salt.
 */
export function generateSalt(length = 16): string {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hashes a password with a salt using the SHA-256 algorithm.
 * @param password The password to hash.
 * @param salt The salt to use for hashing.
 * @returns A promise that resolves to the hexadecimal string of the hash.
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Verifies a password against a stored hash and salt.
 * @param password The password to verify.
 * @param salt The salt used when the original hash was created.
 * @param storedHash The hash to compare against.
 * @returns A promise that resolves to true if the password is valid, false otherwise.
 */
export async function verifyPassword(password: string, salt: string, storedHash: string): Promise<boolean> {
  const hash = await hashPassword(password, salt);
  return hash === storedHash;
}
