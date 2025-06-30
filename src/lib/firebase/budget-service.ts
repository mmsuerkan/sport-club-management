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

const BUDGETS_COLLECTION = 'budgets';

export class BudgetService {
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
      const budgetRef = doc(db, BUDGETS_COLLECTION, budgetId);
      await deleteDoc(budgetRef);
    } catch (error) {
      console.error('Error deleting budget:', error);
      throw new Error('Bütçe silinirken hata oluştu');
    }
  }

  static async getBudgets(period?: string): Promise<Budget[]> {
    try {
      console.log('getBudgets called with period:', period);
      
      // Simple query without composite index requirement
      const budgetsQuery = period && period !== 'all' 
        ? query(collection(db, BUDGETS_COLLECTION), where('period', '==', period))
        : query(collection(db, BUDGETS_COLLECTION));

      const snapshot = await getDocs(budgetsQuery);
      console.log('getBudgets snapshot size:', snapshot.size);
      console.log('getBudgets snapshot docs:', snapshot.docs.length);
      
      const budgets = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Budget doc data:', doc.id, data);
        
        return {
          id: doc.id,
          ...data,
          startDate: data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate),
          endDate: data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)
        } as Budget;
      });

      console.log('getBudgets mapped budgets:', budgets);
      
      // Sort manually in memory
      const sortedBudgets = budgets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      console.log('getBudgets sorted budgets:', sortedBudgets);
      
      return sortedBudgets;
    } catch (error) {
      console.error('Error getting budgets:', error);
      // Return empty array instead of throwing
      return [];
    }
  }

  static subscribeToBudgets(
    callback: (budgets: Budget[]) => void,
    period?: string
  ): () => void {
    const budgetsQuery = period && period !== 'all' 
      ? query(collection(db, BUDGETS_COLLECTION), where('period', '==', period))
      : query(collection(db, BUDGETS_COLLECTION));

    return onSnapshot(budgetsQuery, (snapshot) => {
      const budgets = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startDate: data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate),
          endDate: data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)
        } as Budget;
      });
      
      // Sort manually in memory
      const sortedBudgets = budgets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      callback(sortedBudgets);
    }, (error) => {
      console.error('Error in budgets subscription:', error);
      callback([]);
    });
  }
}