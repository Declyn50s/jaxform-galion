import { useEffect, useRef } from 'react';
import { FormData } from '@/types/form';
import { generateAutoSaveKey } from '@/lib/helpers';

export function useAutoSave(
  formData: FormData,
  userEmail: string | null,
  interval: number = 5000 // 5 seconds
) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSaveRef = useRef<string>('');

  useEffect(() => {
    if (!userEmail) return;

    const currentDataString = JSON.stringify(formData);
    
    // Only save if data has changed
    if (currentDataString === lastSaveRef.current) return;

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      const saveKey = generateAutoSaveKey(userEmail);
      localStorage.setItem(saveKey, currentDataString);
      localStorage.setItem(`${saveKey}-timestamp`, new Date().toISOString());
      lastSaveRef.current = currentDataString;
    }, interval);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [formData, userEmail, interval]);

  const loadSavedData = (email: string): FormData | null => {
    try {
      const saveKey = generateAutoSaveKey(email);
      const savedData = localStorage.getItem(saveKey);
      if (savedData) {
        return JSON.parse(savedData);
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
    return null;
  };

  const clearSavedData = (email: string) => {
    const saveKey = generateAutoSaveKey(email);
    localStorage.removeItem(saveKey);
    localStorage.removeItem(`${saveKey}-timestamp`);
  };

  const getLastSaveTime = (email: string): Date | null => {
    try {
      const saveKey = generateAutoSaveKey(email);
      const timestamp = localStorage.getItem(`${saveKey}-timestamp`);
      return timestamp ? new Date(timestamp) : null;
    } catch {
      return null;
    }
  };

  return {
    loadSavedData,
    clearSavedData,
    getLastSaveTime
  };
}