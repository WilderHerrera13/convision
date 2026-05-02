import React, { createContext, useState, useContext, useCallback } from 'react';

const STORAGE_KEY_ID   = 'convision_branch_id';
const STORAGE_KEY_NAME = 'convision_branch_name';

interface BranchContextValue {
  branchId: number | null;
  branchName: string | null;
  setBranch: (id: number, name: string) => void;
  clearBranch: () => void;
}

const BranchContext = createContext<BranchContextValue | null>(null);

export const useBranch = (): BranchContextValue => {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error('useBranch must be used within a BranchProvider');
  return ctx;
};

export const BranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branchId, setBranchId] = useState<number | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_ID);
    return stored ? parseInt(stored, 10) : null;
  });
  const [branchName, setBranchName] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY_NAME);
  });

  const setBranch = useCallback((id: number, name: string) => {
    localStorage.setItem(STORAGE_KEY_ID, String(id));
    localStorage.setItem(STORAGE_KEY_NAME, name);
    setBranchId(id);
    setBranchName(name);
  }, []);

  const clearBranch = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_ID);
    localStorage.removeItem(STORAGE_KEY_NAME);
    setBranchId(null);
    setBranchName(null);
  }, []);

  return (
    <BranchContext.Provider value={{ branchId, branchName, setBranch, clearBranch }}>
      {children}
    </BranchContext.Provider>
  );
};
