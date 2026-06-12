import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for components that want their semester selector to stay in sync with the
 * global semester (the one chosen from Settings / TeacherLayout).
 *
 * - Initializes from localStorage.
 * - Subscribes to the `academic-context-changed` event and updates local state
 *   whenever the global semester changes (so pressing Semester 2 in Settings
 *   updates every selector across the app immediately).
 * - The returned setter updates LOCAL state only by default. Pass
 *   `{ broadcast: true }` to also persist to localStorage and broadcast the
 *   change to all listening components.
 *
 * @returns {[string, (s: string, opts?: { broadcast?: boolean }) => void]}
 */
export default function useGlobalSemester() {
  const [semester, setSemester] = useState(() => localStorage.getItem('semester') === '2' ? '2' : '1');

  useEffect(() => {
    const sync = () => setSemester(localStorage.getItem('semester') === '2' ? '2' : '1');
    window.addEventListener('academic-context-changed', sync);
    return () => window.removeEventListener('academic-context-changed', sync);
  }, []);

  const updateSemester = useCallback((v, opts) => {
    const next = v === '2' ? '2' : '1';
    setSemester(next);
    if (opts?.broadcast) {
      localStorage.setItem('semester', next);
      window.dispatchEvent(new Event('academic-context-changed'));
    }
  }, []);

  return [semester, updateSemester];
}
