import Store from 'electron-store';
import { useState, useEffect } from 'react';

export const store = new Store();

export const SERVER_ADDRESS_KEY = 'server_address';
export const SESSION_KEY = 'session';
export const SERVER_SECRET = 'StaticSecret';

export const useElectronStore = (key: string, initialValue?: any) => {
  const [value, setValue] = useState(store.get(key, null));

  useEffect(() => {
    store.set(key, value);
  }, [value]);

  if (!value && initialValue) setValue(initialValue);
  return [value, setValue];
};
