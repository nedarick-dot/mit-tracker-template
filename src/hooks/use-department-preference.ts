import { useState, useCallback } from 'react';
import type { Department } from '@/lib/constants';

const KEY = 'q3_mit_dept_pref';

export function useDepartmentPreference() {
  const [dept, setDeptState] = useState<Department | null>(() => {
    return (localStorage.getItem(KEY) as Department | null);
  });

  const setDept = useCallback((d: Department | null) => {
    if (d) localStorage.setItem(KEY, d);
    else localStorage.removeItem(KEY);
    setDeptState(d);
  }, []);

  return { dept, setDept };
}
