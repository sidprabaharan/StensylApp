import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClientOptions } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase URL or Anon Key is missing. Ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in your environment.'
  );
}

interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

let storage: StorageAdapter;

if (Platform.OS === 'web') {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    // Use localStorage for web if available
    storage = {
      getItem: async (key: string) => window.localStorage.getItem(key),
      setItem: async (key: string, value: string) => window.localStorage.setItem(key, value),
      removeItem: async (key: string) => window.localStorage.removeItem(key),
    };
  } else {
    // Fallback for web (SSR or non-browser environments) - in-memory storage
    // This won't persist across sessions but prevents errors.
    const memoryStorage: { [key: string]: string } = {};
    storage = {
      getItem: async (key: string) => memoryStorage[key] || null,
      setItem: async (key: string, value: string) => { memoryStorage[key] = value; },
      removeItem: async (key: string) => { delete memoryStorage[key]; },
    };
  }
} else {
  // Native platforms (iOS, Android)
  // Dynamically require AsyncStorage to avoid issues during web bundling if it's not platform-gated
  const RNASyncStorage = require('@react-native-async-storage/async-storage').default;
  storage = RNASyncStorage;
}

const supabaseOptions: SupabaseClientOptions<'public'> = {
  auth: {
    storage: storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web', // Enable for web, disable for React Native
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions); 