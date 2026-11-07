import AsyncStorage from '@react-native-async-storage/async-storage';
import * as aesjs from 'aes-js';
import { getRandomBytes } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { logger } from './logger';

// Supabase's documented pattern for encrypting the session on React Native.
// SecureStore (Android Keystore, iOS Keychain) is the safe place for secrets
// but only holds about 2 KB per entry, and a session is bigger than that. So
// each save encrypts the session with a new random AES-256 key: the key goes in
// SecureStore and the encrypted session in AsyncStorage. Someone who copies the
// app's files gets ciphertext without the key.
//
// A new key per save means CTR mode never reuses a key and counter pair.
export class SecureSessionStorage {
  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;

    const keyHex = await SecureStore.getItemAsync(key);
    if (!keyHex) {
      // The key can be lost while the ciphertext survives, for example when
      // Android restores app data from a backup onto a new phone. Treat it as
      // signed out rather than crashing.
      await AsyncStorage.removeItem(key);
      return null;
    }

    try {
      const cipher = new aesjs.ModeOfOperation.ctr(
        aesjs.utils.hex.toBytes(keyHex),
        new aesjs.Counter(1),
      );
      return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(encrypted)));
    } catch (error) {
      logger.error('session decryption', error);
      await this.removeItem(key);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    const encryptionKey = getRandomBytes(32);
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encrypted = cipher.encrypt(aesjs.utils.utf8.toBytes(value));

    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));
    await AsyncStorage.setItem(key, aesjs.utils.hex.fromBytes(encrypted));
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  }
}
