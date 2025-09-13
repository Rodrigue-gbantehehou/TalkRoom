// AES-GCM encryption utilities
export class EncryptionService {
  private key: CryptoKey | null = null;

  async generateKey(): Promise<CryptoKey> {
    const key = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );
    this.key = key;
    return key;
  }

  async deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    
    this.key = key;
    return key;
  }

  async encrypt(plaintext: string): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
    if (!this.key) {
      throw new Error('Encryption key not set');
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM

    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      this.key,
      data
    );

    return { encrypted, iv };
  }

  async decrypt(encryptedData: ArrayBuffer, iv: Uint8Array): Promise<string> {
    if (!this.key) {
      throw new Error('Encryption key not set');
    }

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      this.key,
      encryptedData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  async exportKey(): Promise<ArrayBuffer> {
    if (!this.key) {
      throw new Error('No key to export');
    }
    return await crypto.subtle.exportKey('raw', this.key);
  }

  async importKey(keyData: ArrayBuffer): Promise<void> {
    this.key = await crypto.subtle.importKey(
      'raw',
      keyData,
      'AES-GCM',
      true,
      ['encrypt', 'decrypt']
    );
  }
}
