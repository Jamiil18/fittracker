import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { SecureSessionStorage } from './secure-session-storage';

// An in-memory stand-in for the device's secure storage.
const mockSecureValues = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockSecureValues.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecureValues.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecureValues.delete(key);
  }),
}));

jest.mock('expo-crypto', () => ({
  getRandomBytes: (count: number) =>
    Uint8Array.from({ length: count }, () => Math.floor(Math.random() * 256)),
}));

const session = JSON.stringify({ access_token: 'header.payload.signature', refresh_token: 'r1' });

describe('SecureSessionStorage', () => {
  const storage = new SecureSessionStorage();

  beforeEach(async () => {
    mockSecureValues.clear();
    await AsyncStorage.clear();
  });

  it('returns exactly what was saved', async () => {
    await storage.setItem('session', session);
    expect(await storage.getItem('session')).toBe(session);
  });

  it('keeps only ciphertext in AsyncStorage and only the key in SecureStore', async () => {
    await storage.setItem('session', session);

    const stored = await AsyncStorage.getItem('session');
    expect(stored).not.toBeNull();
    expect(stored).not.toContain('refresh_token');
    expect(stored).toMatch(/^[0-9a-f]+$/);

    const keyHex = mockSecureValues.get('session');
    expect(keyHex).toMatch(/^[0-9a-f]{64}$/);
  });

  it('uses a new key every time it saves', async () => {
    await storage.setItem('session', session);
    const firstKey = mockSecureValues.get('session');
    await storage.setItem('session', session);
    expect(mockSecureValues.get('session')).not.toBe(firstKey);
  });

  it('removes both halves', async () => {
    await storage.setItem('session', session);
    await storage.removeItem('session');

    expect(await AsyncStorage.getItem('session')).toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('session');
    expect(await storage.getItem('session')).toBeNull();
  });

  it('treats ciphertext without its key as signed out and clears it', async () => {
    await storage.setItem('session', session);
    mockSecureValues.clear();

    expect(await storage.getItem('session')).toBeNull();
    expect(await AsyncStorage.getItem('session')).toBeNull();
  });
});
