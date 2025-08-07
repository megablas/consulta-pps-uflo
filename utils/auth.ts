// Helper to convert ArrayBuffer to hex string
function bufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Generates a random salt as a hex string
export function generateSalt(): string {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  return bufferToHex(salt);
}

// Hashes a password with a given salt using SHA-256
export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const passwordWithSalt = encoder.encode(password + salt);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', passwordWithSalt);
  return bufferToHex(hashBuffer);
}

// Verifies a password against a stored salt and hash
export async function verifyPassword(password: string, salt: string, storedHash: string): Promise<boolean> {
  const newHash = await hashPassword(password, salt);
  return newHash === storedHash;
}
