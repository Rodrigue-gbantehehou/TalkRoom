import { useRef } from 'react';
import { EncryptionService } from '@/lib/encryption';

export function useEncryption() {
  const encryptionService = useRef(new EncryptionService());

  const generateRoomKey = async (roomCode: string) => {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    await encryptionService.current.deriveKeyFromPassword(roomCode, salt);
    return salt; // Return salt for sharing with other participants
  };

  const importRoomKey = async (roomCode: string, salt: Uint8Array) => {
    await encryptionService.current.deriveKeyFromPassword(roomCode, salt);
  };

  const encryptMessage = async (message: string) => {
    return await encryptionService.current.encrypt(message);
  };

  const decryptMessage = async (encryptedData: ArrayBuffer, iv: Uint8Array) => {
    return await encryptionService.current.decrypt(encryptedData, iv);
  };

  return {
    generateRoomKey,
    importRoomKey,
    encryptMessage,
    decryptMessage
  };
}
