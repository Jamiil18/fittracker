import { randomUUID } from 'expo-crypto';

// A random v4 UUID, for rows created on the phone before they reach the
// server, such as a workout and the keys of its exercises and sets.
export function newId(): string {
  return randomUUID();
}
