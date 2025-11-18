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

// Helper to convert hex string to Uint8Array
function hexToUint8Array(hexString: string): Uint8Array {
    return new Uint8Array(hexString.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
}

// Helper to convert ArrayBuffer to hex string
function arrayBufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Derives a key from a password and salt using PBKDF2.
 * @param password The password to hash.
 * @param salt The salt to use for hashing (as a hex string).
 * @returns A promise that resolves to the hexadecimal string of the derived key.
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const saltBuffer = hexToUint8Array(salt);

    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    const derivedKeyBuffer = await window.crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: saltBuffer,
            iterations: 200000, // Number of iterations - a key security parameter
            hash: 'SHA-256',
        },
        keyMaterial,
        256 // Key length in bits
    );

    return arrayBufferToHex(derivedKeyBuffer);
}

/**
 * Hashes a password using the legacy SHA-256 method for backward compatibility.
 * @param password The password to hash.
 * @param salt The salt to use.
 * @returns A promise that resolves to the SHA-256 hash.
 */
async function oldHashPasswordWithSHA256(password: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    // Assumes the old method was a simple concatenation of password and salt
    const data = encoder.encode(password + salt); 
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}


/**
 * Verifies a password against a stored hash and salt.
 * It first tries the new PBKDF2 method. If it fails, it tries the legacy SHA-256 method.
 * @param password The password to verify.
 * @param salt The salt used when the original hash was created.
 * @param storedHash The hash to compare against.
 * @returns A promise that resolves to an object indicating if the password is valid and if the hash needs to be upgraded.
 */
export async function verifyPassword(password: string, salt: string, storedHash: string): Promise<{ isValid: boolean; needsUpgrade: boolean }> {
  // 1. Try the new, stronger PBKDF2 method
  const pbkdf2Hash = await hashPassword(password, salt);
  if (pbkdf2Hash === storedHash) {
    return { isValid: true, needsUpgrade: false };
  }

  // 2. If PBKDF2 fails, it might be an old hash. Try the legacy SHA-256 method.
  const sha256Hash = await oldHashPasswordWithSHA256(password, salt);
  if (sha256Hash === storedHash) {
    // Password is valid but uses an outdated hash. Signal for an upgrade.
    return { isValid: true, needsUpgrade: true }; 
  }
  
  // 3. If both fail, the password is incorrect.
  return { isValid: false, needsUpgrade: false };
}