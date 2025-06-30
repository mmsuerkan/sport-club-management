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
  onSnapshot,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './config';

export interface Budget {
  id?: string;
  category: string;
  plannedAmount: number;
  spentAmount: number;
  period: 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate: Date;
  status: 'active' | 'completed' | 'exceeded';
  description?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface BudgetTransaction {
  id?: string;
  budgetId: string;
  amount: number;
  description: string;
  transactionDate: Date;
  category: string;
  createdAt: Date;
  createdBy: string;
}

const BUDGETS_COLLECTION = 'budgets';
const BUDGET_TRANSACTIONS_COLLECTION = 'budgetTransactions';

export class BudgetService {
  // Budget CRUD Operations
  static async createBudget(budgetData: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const budget: Omit<Budget, 'id'> = {
        ...budgetData,
        spentAmount: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await addDoc(collection(db, BUDGETS_COLLECTION), {
        ...budget,
        startDate: Timestamp.fromDate(budget.startDate),
        endDate: Timestamp.fromDate(budget.endDate),
        createdAt: Timestamp.fromDate(budget.createdAt),
        updatedAt: Timestamp.fromDate(budget.updatedAt)
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating budget:', error);
      throw new Error('Bütçe oluşturulurken hata oluştu');
    }
  }

  static async updateBudget(budgetId: string, updates: Partial<Budget>): Promise<void> {
    try {
      const budgetRef = doc(db, BUDGETS_COLLECTION, budgetId);
      const updateData: any = {
        ...updates,
        updatedAt: Timestamp.fromDate(new Date())
      };

      // Convert dates to Timestamps if they exist
      if (updates.startDate) {
        updateData.startDate = Timestamp.fromDate(updates.startDate);
      }
      if (updates.endDate) {
        updateData.endDate = Timestamp.fromDate(updates.endDate);
      }

      await updateDoc(budgetRef, updateData);
    } catch (error) {
      console.error('Error updating budget:', error);
      throw new Error('Bütçe güncellenirken hata oluştu');
    }
  }

  static async deleteBudget(budgetId: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      // Delete budget
      const budgetRef = doc(db, BUDGETS_COLLECTION, budgetId);
      batch.delete(budgetRef);

      // Delete related transactions
      const transactionsQuery = query(
        collection(db, BUDGET_TRANSACTIONS_COLLECTION),
        where('budgetId', '==', budgetId)
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);
      
      transactionsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    } catch (error) {
      console.error('Error deleting budget:', error);
      throw new Error('Bütçe silinirken hata oluştu');
    }
  }

  static async getBudget(budgetId: string): Promise<Budget | null> {
    try {
      const budgetDoc = await getDoc(doc(db, BUDGETS_COLLECTION, budgetId));
      
      if (!budgetDoc.exists()) {
        return null;
      }

      const data = budgetDoc.data();
      return {
        id: budgetDoc.id,
        ...data,
        startDate: data.startDate.toDate(),
        endDate: data.endDate.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      } as Budget;
    } catch (error) {
      console.error('Error getting budget:', error);
      throw new Error('Bütçe getirilirken hata oluştu');
    }
  }

  static async getBudgets(period?: string): Promise<Budget[]> {
    try {
      let budgetsQuery = query(
        collection(db, BUDGETS_COLLECTION),
        orderBy('createdAt', 'desc')
      );

      if (period && period !== 'all') {
        budgetsQuery = query(
          collection(db, BUDGETS_COLLECTION),
          where('period', '==', period),
          orderBy('createdAt', 'desc')
        );
      }

      const snapshot = await getDocs(budgetsQuery);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startDate: data.startDate.toDate(),
          endDate: data.endDate.toDate(),
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        } as Budget;
      });
    } catch (error) {
      console.error('Error getting budgets:', error);
      throw new Error('Bütçeler getirilirken hata oluştu');
    }
  }

  // Real-time listener for budgets
  static subscribeToBudgets(
    callback: (budgets: Budget[]) => void,
    period?: string
  ): () => void {
    let budgetsQuery = query(
      collection(db, BUDGETS_COLLECTION),
      orderBy('createdAt', 'desc')
    );

    if (period && period !== 'all') {
      budgetsQuery = query(
        collection(db, BUDGETS_COLLECTION),
        where('period', '==', period),
        orderBy('createdAt', 'desc')
      );
    }

    return onSnapshot(budgetsQuery, (snapshot) => {
      const budgets = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startDate: data.startDate.toDate(),
          endDate: data.endDate.toDate(),
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        } as Budget;
      });
      callback(budgets);
    }, (error) => {
      console.error('Error in budgets subscription:', error);
    });
  }

  // Budget Transaction Operations
  static async recordBudgetTransaction(transactionData: Omit<BudgetTransaction, 'id' | 'createdAt'>): Promise<string> {
    try {
      const batch = writeBatch(db);

      // Create transaction
      const transactionRef = doc(collection(db, BUDGET_TRANSACTIONS_COLLECTION));
      const transaction: Omit<BudgetTransaction, 'id'> = {
        ...transactionData,
        createdAt: new Date()
      };

      batch.set(transactionRef, {
        ...transaction,
        transactionDate: Timestamp.fromDate(transaction.transactionDate),
        createdAt: Timestamp.fromDate(transaction.createdAt)
      });

      // Update budget spent amount
      const budgetRef = doc(db, BUDGETS_COLLECTION, transactionData.budgetId);
      const budgetDoc = await getDoc(budgetRef);
      
      if (budgetDoc.exists()) {
        const budgetData = budgetDoc.data();
        const newSpentAmount = budgetData.spentAmount + transactionData.amount;
        const newStatus = newSpentAmount > budgetData.plannedAmount ? 'exceeded' : 'active';

        batch.update(budgetRef, {
          spentAmount: newSpentAmount,
          status: newStatus,
          updatedAt: Timestamp.fromDate(new Date())
        });
      }

      await batch.commit();
      return transactionRef.id;
    } catch (error) {
      console.error('Error recording budget transaction:', error);
      throw new Error('Bütçe işlemi kaydedilirken hata oluştu');
    }
  }

  static async getBudgetTransactions(budgetId: string): Promise<BudgetTransaction[]> {
    try {
      const transactionsQuery = query(
        collection(db, BUDGET_TRANSACTIONS_COLLECTION),
        where('budgetId', '==', budgetId),
        orderBy('transactionDate', 'desc')
      );

      const snapshot = await getDocs(transactionsQuery);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          transactionDate: data.transactionDate.toDate(),
          createdAt: data.createdAt.toDate()
        } as BudgetTransaction;
      });
    } catch (error) {
      console.error('Error getting budget transactions:', error);
      throw new Error('Bütçe işlemleri getirilirken hata oluştu');
    }
  }

  // Utility methods
  static async recalculateBudgetSpentAmount(budgetId: string): Promise<void> {
    try {
      const transactions = await this.getBudgetTransactions(budgetId);
      const totalSpent = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);

      const budgetRef = doc(db, BUDGETS_COLLECTION, budgetId);
      const budgetDoc = await getDoc(budgetRef);
      
      if (budgetDoc.exists()) {
        const budgetData = budgetDoc.data();
        const newStatus = totalSpent > budgetData.plannedAmount ? 'exceeded' : 'active';

        await updateDoc(budgetRef, {
          spentAmount: totalSpent,
          status: newStatus,
          updatedAt: Timestamp.fromDate(new Date())
        });
      }
    } catch (error) {
      console.error('Error recalculating budget spent amount:', error);
      throw new Error('Bütçe harcama tutarı yeniden hesaplanırken hata oluştu');
    }
  }

  static async getActiveBudgets(): Promise<Budget[]> {
    try {
      const activeBudgetsQuery = query(
        collection(db, BUDGETS_COLLECTION),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(activeBudgetsQuery);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startDate: data.startDate.toDate(),
          endDate: data.endDate.toDate(),
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        } as Budget;
      });
    } catch (error) {
      console.error('Error getting active budgets:', error);
      throw new Error('Aktif bütçeler getirilirken hata oluştu');
    }
  }

  static getBudgetUsagePercentage(budget: Budget): number {
    if (budget.plannedAmount === 0) return 0;
    return Math.round((budget.spentAmount / budget.plannedAmount) * 100);
  }

  static getBudgetRemainingAmount(budget: Budget): number {
    return budget.plannedAmount - budget.spentAmount;
  }

  static isBudgetOverspent(budget: Budget): boolean {
    return budget.spentAmount > budget.plannedAmount;
  }
}