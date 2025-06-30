import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
  onSnapshot,
  Query
} from 'firebase/firestore';
import { db } from './config';

// Financial Transaction Interface
export interface FinancialTransaction {
  id?: string;
  date: Timestamp;
  description: string;
  category: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'check';
  status: 'pending' | 'completed' | 'cancelled';
  type: 'income' | 'expense';
  clubId: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  tags?: string[];
  attachments?: string[];
  reference?: string;
}

// Categories Interface
export interface FinancialCategory {
  id?: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  clubId: string;
  isActive: boolean;
  createdAt: Timestamp;
}

// Filters Interface
export interface TransactionFilters {
  category?: string;
  type?: 'income' | 'expense';
  status?: string;
  paymentMethod?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  lastDoc?: QueryDocumentSnapshot<DocumentData>;
}

export class FinanceService {
  private transactionsCollection = 'financial_transactions';
  private categoriesCollection = 'financial_categories';

  // CREATE - Add new transaction
  async createTransaction(transaction: Omit<FinancialTransaction, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const now = Timestamp.now();
      const docData = {
        ...transaction,
        createdAt: now,
        updatedAt: now
      };
      
      const docRef = await addDoc(collection(db, this.transactionsCollection), docData);
      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // READ - Get transactions with pagination and filters
  async getTransactions(clubId: string, filters?: TransactionFilters) {
    try {
      let q = query(
        collection(db, this.transactionsCollection),
        where('clubId', '==', clubId),
        orderBy('date', 'desc')
      );

      // Apply filters
      if (filters?.category) {
        q = query(q, where('category', '==', filters.category));
      }
      if (filters?.type) {
        q = query(q, where('type', '==', filters.type));
      }
      if (filters?.status) {
        q = query(q, where('status', '==', filters.status));
      }
      if (filters?.paymentMethod) {
        q = query(q, where('paymentMethod', '==', filters.paymentMethod));
      }
      if (filters?.startDate) {
        q = query(q, where('date', '>=', Timestamp.fromDate(filters.startDate)));
      }
      if (filters?.endDate) {
        q = query(q, where('date', '<=', Timestamp.fromDate(filters.endDate)));
      }
      if (filters?.limit) {
        q = query(q, limit(filters.limit));
      }
      if (filters?.lastDoc) {
        q = query(q, startAfter(filters.lastDoc));
      }

      const snapshot = await getDocs(q);
      return {
        success: true,
        transactions: snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as FinancialTransaction)),
        lastDoc: snapshot.docs[snapshot.docs.length - 1]
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        transactions: [],
        lastDoc: null
      };
    }
  }

  // Real-time listener for transactions
  subscribeToTransactions(
    clubId: string, 
    callback: (transactions: FinancialTransaction[]) => void,
    filters?: TransactionFilters
  ) {
    let q = query(
      collection(db, this.transactionsCollection),
      where('clubId', '==', clubId),
      orderBy('date', 'desc')
    );

    // Apply filters
    if (filters?.category) {
      q = query(q, where('category', '==', filters.category));
    }
    if (filters?.type) {
      q = query(q, where('type', '==', filters.type));
    }
    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }
    if (filters?.limit) {
      q = query(q, limit(filters.limit));
    }

    return onSnapshot(q, (snapshot) => {
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FinancialTransaction));
      callback(transactions);
    });
  }

  // UPDATE - Update existing transaction
  async updateTransaction(id: string, updates: Partial<FinancialTransaction>) {
    try {
      const docRef = doc(db, this.transactionsCollection, id);
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now()
      };
      
      await updateDoc(docRef, updateData);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // DELETE - Delete transaction
  async deleteTransaction(id: string) {
    try {
      const docRef = doc(db, this.transactionsCollection, id);
      await deleteDoc(docRef);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get single transaction
  async getTransaction(id: string) {
    try {
      const docRef = doc(db, this.transactionsCollection, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          success: true,
          transaction: {
            id: docSnap.id,
            ...docSnap.data()
          } as FinancialTransaction
        };
      }
      return { success: false, error: 'Transaction not found' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // CATEGORIES CRUD
  async getCategories(clubId: string) {
    try {
      console.log('Getting categories for clubId:', clubId);
      const q = query(
        collection(db, this.categoriesCollection),
        where('clubId', '==', clubId),
        where('isActive', '==', true),
        orderBy('name')
      );
      
      console.log('Executing categories query...');
      const snapshot = await getDocs(q);
      console.log('Categories query returned:', snapshot.docs.length, 'documents');
      
      const categories = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FinancialCategory));
      
      console.log('Parsed categories:', categories);
      
      return {
        success: true,
        categories
      };
    } catch (error) {
      console.error('Error getting categories:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        categories: []
      };
    }
  }

  async createCategory(category: Omit<FinancialCategory, 'id' | 'createdAt'>) {
    try {
      console.log('Creating category:', category);
      const docData = {
        ...category,
        createdAt: Timestamp.now()
      };
      
      console.log('Category data to save:', docData);
      const docRef = await addDoc(collection(db, this.categoriesCollection), docData);
      console.log('Category created with ID:', docRef.id);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating category:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Analytics helpers
  async getFinancialSummary(clubId: string, startDate: Date, endDate: Date) {
    try {
      const q = query(
        collection(db, this.transactionsCollection),
        where('clubId', '==', clubId),
        where('status', '==', 'completed'),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate))
      );

      const snapshot = await getDocs(q);
      const transactions = snapshot.docs.map(doc => doc.data() as FinancialTransaction);

      const summary = {
        totalIncome: 0,
        totalExpense: 0,
        netBalance: 0,
        transactionCount: transactions.length,
        categoryBreakdown: {} as Record<string, number>,
        paymentMethodBreakdown: {} as Record<string, number>
      };

      transactions.forEach(transaction => {
        if (transaction.type === 'income') {
          summary.totalIncome += transaction.amount;
        } else {
          summary.totalExpense += transaction.amount;
        }

        // Category breakdown
        if (!summary.categoryBreakdown[transaction.category]) {
          summary.categoryBreakdown[transaction.category] = 0;
        }
        summary.categoryBreakdown[transaction.category] += transaction.amount;

        // Payment method breakdown
        if (!summary.paymentMethodBreakdown[transaction.paymentMethod]) {
          summary.paymentMethodBreakdown[transaction.paymentMethod] = 0;
        }
        summary.paymentMethodBreakdown[transaction.paymentMethod] += transaction.amount;
      });

      summary.netBalance = summary.totalIncome - summary.totalExpense;
      
      return { success: true, summary };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        summary: null
      };
    }
  }

  // Monthly financial report
  async getMonthlyReport(clubId: string, year: number, month: number) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const result = await this.getFinancialSummary(clubId, startDate, endDate);
      return result;
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        summary: null
      };
    }
  }

  // Get transactions by date range
  async getTransactionsByDateRange(clubId: string, startDate: Date, endDate: Date) {
    return this.getTransactions(clubId, { startDate, endDate });
  }

  // Bulk operations
  async bulkUpdateTransactions(updates: Array<{ id: string; updates: Partial<FinancialTransaction> }>) {
    try {
      const promises = updates.map(({ id, updates: updateData }) => 
        this.updateTransaction(id, updateData)
      );
      
      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.success).length;
      
      return {
        success: successCount === updates.length,
        successCount,
        totalCount: updates.length
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        successCount: 0,
        totalCount: updates.length
      };
    }
  }
}

export const financeService = new FinanceService();