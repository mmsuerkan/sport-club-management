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
  Timestamp,
  limit
} from 'firebase/firestore';
import { db } from './config';

export interface Transaction {
  id?: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: Date;
  createdAt: Date;
  branchId?: string;
  branchName?: string;
  groupId?: string;
  groupName?: string;
  studentId?: string;
  studentName?: string;
  trainerId?: string;
  trainerName?: string;
}

const TRANSACTIONS_COLLECTION = 'transactions';

export class TransactionService {
  // Tüm işlemleri getir
  static async getAllTransactions(): Promise<Transaction[]> {
    try {
      const q = query(
        collection(db, TRANSACTIONS_COLLECTION),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const transactions: Transaction[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          ...data,
          date: data.date.toDate(),
          createdAt: data.createdAt.toDate()
        } as Transaction);
      });
      
      return transactions;
    } catch (error) {
      console.error('Error getting transactions:', error);
      throw error;
    }
  }

  // Belirli dönem işlemleri
  static async getTransactionsByPeriod(
    startDate: Date, 
    endDate: Date, 
    type?: 'income' | 'expense'
  ): Promise<Transaction[]> {
    try {
      let q = query(
        collection(db, TRANSACTIONS_COLLECTION),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'desc')
      );

      if (type) {
        q = query(
          collection(db, TRANSACTIONS_COLLECTION),
          where('type', '==', type),
          where('date', '>=', Timestamp.fromDate(startDate)),
          where('date', '<=', Timestamp.fromDate(endDate)),
          orderBy('date', 'desc')
        );
      }
      
      const querySnapshot = await getDocs(q);
      const transactions: Transaction[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          ...data,
          date: data.date.toDate(),
          createdAt: data.createdAt.toDate()
        } as Transaction);
      });
      
      return transactions;
    } catch (error) {
      console.error('Error getting transactions by period:', error);
      throw error;
    }
  }

  // Bu ay işlemleri
  static async getThisMonthTransactions(type?: 'income' | 'expense'): Promise<Transaction[]> {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    return this.getTransactionsByPeriod(startOfMonth, endOfMonth, type);
  }

  // Tip bazlı toplam tutar
  static async getTotalAmountByType(type: 'income' | 'expense'): Promise<number> {
    try {
      const q = query(
        collection(db, TRANSACTIONS_COLLECTION),
        where('type', '==', type)
      );
      
      const querySnapshot = await getDocs(q);
      let total = 0;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        total += data.amount;
      });
      
      return total;
    } catch (error) {
      console.error('Error getting total amount by type:', error);
      throw error;
    }
  }

  // Bu ay tip bazlı toplam tutar
  static async getThisMonthAmountByType(type: 'income' | 'expense'): Promise<number> {
    const transactions = await this.getThisMonthTransactions(type);
    return transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  }

  // Şube bazlı işlemler
  static async getTransactionsByBranch(branchId: string): Promise<Transaction[]> {
    try {
      const q = query(
        collection(db, TRANSACTIONS_COLLECTION),
        where('branchId', '==', branchId),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const transactions: Transaction[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          ...data,
          date: data.date.toDate(),
          createdAt: data.createdAt.toDate()
        } as Transaction);
      });
      
      return transactions;
    } catch (error) {
      console.error('Error getting transactions by branch:', error);
      throw error;
    }
  }

  // Şube bazlı toplam tutar
  static async getBranchAmountByType(branchId: string, type: 'income' | 'expense'): Promise<number> {
    try {
      const q = query(
        collection(db, TRANSACTIONS_COLLECTION),
        where('branchId', '==', branchId),
        where('type', '==', type)
      );
      
      const querySnapshot = await getDocs(q);
      let total = 0;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        total += data.amount;
      });
      
      return total;
    } catch (error) {
      console.error('Error getting branch amount by type:', error);
      throw error;
    }
  }

  // Kategori bazlı işlemler
  static async getTransactionsByCategory(category: string): Promise<Transaction[]> {
    try {
      const q = query(
        collection(db, TRANSACTIONS_COLLECTION),
        where('category', '==', category),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const transactions: Transaction[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          ...data,
          date: data.date.toDate(),
          createdAt: data.createdAt.toDate()
        } as Transaction);
      });
      
      return transactions;
    } catch (error) {
      console.error('Error getting transactions by category:', error);
      throw error;
    }
  }

  // Son işlemler
  static async getRecentTransactions(count: number = 10): Promise<Transaction[]> {
    try {
      const q = query(
        collection(db, TRANSACTIONS_COLLECTION),
        orderBy('createdAt', 'desc'),
        limit(count)
      );
      
      const querySnapshot = await getDocs(q);
      const transactions: Transaction[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          ...data,
          date: data.date.toDate(),
          createdAt: data.createdAt.toDate()
        } as Transaction);
      });
      
      return transactions;
    } catch (error) {
      console.error('Error getting recent transactions:', error);
      throw error;
    }
  }

  // İşlem istatistikleri
  static async getTransactionStats(): Promise<{
    totalIncome: number;
    totalExpenses: number;
    thisMonthIncome: number;
    thisMonthExpenses: number;
    netIncome: number;
    transactionCount: number;
  }> {
    try {
      const totalIncome = await this.getTotalAmountByType('income');
      const totalExpenses = await this.getTotalAmountByType('expense');
      const thisMonthIncome = await this.getThisMonthAmountByType('income');
      const thisMonthExpenses = await this.getThisMonthAmountByType('expense');
      
      const allTransactions = await this.getAllTransactions();
      
      return {
        totalIncome,
        totalExpenses,
        thisMonthIncome,
        thisMonthExpenses,
        netIncome: totalIncome - totalExpenses,
        transactionCount: allTransactions.length
      };
    } catch (error) {
      console.error('Error getting transaction stats:', error);
      throw error;
    }
  }
}