import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { CredentialStorage } from './auth-client';

const key = 'grainledger.auth.refresh.v1';
const marker = 'grainledger.auth.restore.v1'; // Non-sensitive logout barrier; contains no tokens or identity.
export const persistentSignInAvailable = Platform.OS !== 'web';
export const credentialStorage: CredentialStorage = {
  async read() {
    if (!persistentSignInAvailable || await AsyncStorage.getItem(marker) !== 'active') return null;
    return SecureStore.getItemAsync(key);
  },
  async write(value) {
    if (!persistentSignInAvailable) {
      if (value !== null) throw new Error('Persistent sign-in is not available in the web preview.');
      return;
    }
    if (value === null) {
      // Either successful operation prevents restoration; report partial cleanup failures as well.
      const results = await Promise.allSettled([
        AsyncStorage.setItem(marker, 'signed-out'), SecureStore.deleteItemAsync(key),
      ]);
      if (results.some((result) => result.status === 'rejected')) throw new Error('Secure credential cleanup could not be completed.');
      return;
    }
    await AsyncStorage.setItem(marker, 'signed-out');
    await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    await AsyncStorage.setItem(marker, 'active');
  },
};
