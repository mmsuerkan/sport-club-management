import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  financeService, 
  FinancialTransaction, 
  FinancialCategory, 
  TransactionFilters 
} from '@/lib/firebase/finance-service';
import { defaultFinancialCategories } from '@/lib/firebase/finance-categories';
import { Timestamp } from 'firebase/firestore';

export interface UseFinanceReturn {
  // Data
  transactions: FinancialTransaction[];
  categories: FinancialCategory[];
  summary: {
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
    transactionCount: number;
    categoryBreakdown: Record<string, number>;
    paymentMethodBreakdown: Record<string, number>;
  } | null;
  
  // Loading states
  loading: boolean;
  categoriesLoading: boolean;
  summaryLoading: boolean;
  
  // Error states
  error: string | null;
  
  // CRUD operations
  createTransaction: (transaction: Omit<FinancialTransaction, 'id' | 'createdAt' | 'updatedAt' | 'clubId' | 'createdBy'>) => Promise<{ success: boolean; error?: string; id?: string }>;
  updateTransaction: (id: string, updates: Partial<FinancialTransaction>) => Promise<{ success: boolean; error?: string }>;
  deleteTransaction: (id: string) => Promise<{ success: boolean; error?: string }>;
  
  // Category operations
  createCategory: (category: Omit<FinancialCategory, 'id' | 'clubId' | 'createdAt'>) => Promise<{ success: boolean; error?: string; id?: string }>;
  
  // Data operations
  loadTransactions: (filters?: TransactionFilters) => Promise<void>;
  loadSummary: (startDate: Date, endDate: Date) => Promise<void>;
  refreshData: () => Promise<void>;
  
  // Utilities
  formatCurrency: (amount: number) => string;
  getStatusColor: (status: string) => string;
  getTypeColor: (type: 'income' | 'expense') => string;
}

export function useFinance(): UseFinanceReturn {
  const { userData } = useAuth();
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [summary, setSummary] = useState<UseFinanceReturn['summary']>(null);
  
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clubId = userData?.clubId;

  // Load categories
  const loadCategories = useCallback(async () => {
    if (!clubId) return;
    
    setCategoriesLoading(true);
    try {
      const result = await financeService.getCategories(clubId);
      if (result.success) {
        setCategories(result.categories);
        
        // If no categories exist, create default ones
        if (result.categories.length === 0) {
          const promises = defaultFinancialCategories.map(category =>
            financeService.createCategory({ ...category, clubId })
          );
          await Promise.all(promises);
          
          // Reload categories after creating defaults
          const newResult = await financeService.getCategories(clubId);
          if (newResult.success) {
            setCategories(newResult.categories);
          }
        }
      } else {
        setError(result.error || 'Failed to load categories');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setCategoriesLoading(false);
    }
  }, [clubId]);

  // Load transactions
  const loadTransactions = useCallback(async (filters?: TransactionFilters) => {
    if (!clubId) return;
    
    setLoading(true);
    setError(null);
    try {
      const result = await financeService.getTransactions(clubId, filters);
      if (result.success) {
        setTransactions(result.transactions);
      } else {
        setError(result.error || 'Failed to load transactions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  // Load summary
  const loadSummary = useCallback(async (startDate: Date, endDate: Date) => {
    if (!clubId) return;
    
    setSummaryLoading(true);
    try {
      const result = await financeService.getFinancialSummary(clubId, startDate, endDate);
      if (result.success && result.summary) {
        setSummary(result.summary);
      } else {
        setError(result.error || 'Failed to load summary');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load summary');
    } finally {
      setSummaryLoading(false);
    }
  }, [clubId]);

  // Create transaction
  const createTransaction = useCallback(async (
    transactionData: Omit<FinancialTransaction, 'id' | 'createdAt' | 'updatedAt' | 'clubId' | 'createdBy'>
  ) => {
    if (!clubId || !userData?.email) {
      return { success: false, error: 'Missing club or user data' };
    }

    const result = await financeService.createTransaction({
      ...transactionData,
      clubId,
      createdBy: userData.email
    });

    if (result.success) {
      // Refresh transactions
      await loadTransactions();
    }

    return result;
  }, [clubId, userData?.email, loadTransactions]);

  // Update transaction
  const updateTransaction = useCallback(async (id: string, updates: Partial<FinancialTransaction>) => {
    const result = await financeService.updateTransaction(id, updates);
    
    if (result.success) {
      // Refresh transactions
      await loadTransactions();
    }
    
    return result;
  }, [loadTransactions]);

  // Delete transaction
  const deleteTransaction = useCallback(async (id: string) => {
    const result = await financeService.deleteTransaction(id);
    
    if (result.success) {
      // Refresh transactions
      await loadTransactions();
    }
    
    return result;
  }, [loadTransactions]);

  // Create category
  const createCategory = useCallback(async (
    categoryData: Omit<FinancialCategory, 'id' | 'clubId' | 'createdAt'>
  ) => {
    if (!clubId) {
      return { success: false, error: 'Missing club data' };
    }

    const result = await financeService.createCategory({
      ...categoryData,
      clubId
    });

    if (result.success) {
      // Refresh categories
      await loadCategories();
    }

    return result;
  }, [clubId, loadCategories]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    await Promise.all([
      loadTransactions(),
      loadCategories()
    ]);
  }, [loadTransactions, loadCategories]);

  // Utility functions
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2
    }).format(amount);
  }, []);

  const getStatusColor = useCallback((status: string): string => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-orange-600 bg-orange-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  }, []);

  const getTypeColor = useCallback((type: 'income' | 'expense'): string => {
    return type === 'income' ? 'text-green-600' : 'text-red-600';
  }, []);

  // Load initial data
  useEffect(() => {
    if (clubId) {
      Promise.all([
        loadTransactions(),
        loadCategories()
      ]);
    }
  }, [clubId, loadTransactions, loadCategories]);

  return {
    // Data
    transactions,
    categories,
    summary,
    
    // Loading states
    loading,
    categoriesLoading,
    summaryLoading,
    
    // Error state
    error,
    
    // CRUD operations
    createTransaction,
    updateTransaction,
    deleteTransaction,
    createCategory,
    
    // Data operations
    loadTransactions,
    loadSummary,
    refreshData,
    
    // Utilities
    formatCurrency,
    getStatusColor,
    getTypeColor
  };
}