import { useNetInfo } from '@react-native-community/netinfo';

// isConnected is null until NetInfo has checked, so only an explicit false
// counts as offline; otherwise the banner would flash on every launch.
export function useIsOffline(): boolean {
  return useNetInfo().isConnected === false;
}
