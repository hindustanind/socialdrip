
import { useState, useEffect, Dispatch, SetStateAction } from 'react';

// FIX: Updated the return type to support function updates, similar to React's useState.
function useLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  // FIX: Updated the value type to SetStateAction<T> to allow for a value or a function updater.
  const setValue = (value: SetStateAction<T>) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
          alert('Your closet is full! Please remove some outfits to save new ones.');
      } else {
        console.error(error);
      }
    }
  };
  
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
        if (e.key === key) {
             try {
                setStoredValue(e.newValue ? JSON.parse(e.newValue) : initialValue);
             } catch (error) {
                 console.error(error);
                 setStoredValue(initialValue);
             }
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, initialValue]);


  return [storedValue, setValue];
}

export default useLocalStorage;