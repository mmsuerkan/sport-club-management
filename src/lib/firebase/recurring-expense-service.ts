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
  writeBatch
} from 'firebase/firestore';
import { db } from './config';

export interface RecurringExpense {
  id?: string;
  name: string; // "Antrenör Maaşı - Ahmet Hoca"
  category: string; // "Antrenör Ücretleri"
  amount: number;
  frequency: 'monthly' | 'yearly';
  startDate: Date;
  endDate?: Date; // Optional, sonsuz için null
  isActive: boolean;
  branchId: string;
  branchName: string;
  description: string;
  lastProcessedDate?: Date; // Son işlem tarihi
  nextDueDate: Date; // Bir sonraki vade
  createdAt: Date;
  updatedAt: Date;
}

const RECURRING_EXPENSES_COLLECTION = 'recurring_expenses';

export class RecurringExpenseService {
  // Yeni sabit gider oluşturma
  static async createRecurringExpense(
    expenseData: Omit<RecurringExpense, 'id' | 'createdAt' | 'updatedAt' | 'nextDueDate' | 'lastProcessedDate'>
  ): Promise<void> {
    try {
      const now = new Date();
      const nextDueDate = this.calculateNextDueDate(expenseData.startDate, expenseData.frequency);
      
      const docData = {
        ...expenseData,
        nextDueDate,
        lastProcessedDate: null,
        createdAt: now,
        updatedAt: now
      };

      await addDoc(collection(db, RECURRING_EXPENSES_COLLECTION), {
        ...docData,
        startDate: Timestamp.fromDate(expenseData.startDate),
        endDate: expenseData.endDate ? Timestamp.fromDate(expenseData.endDate) : null,
        nextDueDate: Timestamp.fromDate(nextDueDate),
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
        lastProcessedDate: null
      });
    } catch (error) {
      console.error('Error creating recurring expense:', error);
      throw error;
    }
  }

  // Sabit gider güncelleme
  static async updateRecurringExpense(
    id: string, 
    updates: Partial<Omit<RecurringExpense, 'id' | 'createdAt'>>
  ): Promise<void> {
    try {
      const updateData: any = {
        ...updates,
        updatedAt: Timestamp.fromDate(new Date())
      };

      // Date alanlarını Timestamp'e çevir
      if (updates.startDate) {
        updateData.startDate = Timestamp.fromDate(updates.startDate);
      }
      if (updates.endDate) {
        updateData.endDate = Timestamp.fromDate(updates.endDate);
      }
      if (updates.nextDueDate) {
        updateData.nextDueDate = Timestamp.fromDate(updates.nextDueDate);
      }
      if (updates.lastProcessedDate) {
        updateData.lastProcessedDate = Timestamp.fromDate(updates.lastProcessedDate);
      }

      await updateDoc(doc(db, RECURRING_EXPENSES_COLLECTION, id), updateData);
    } catch (error) {
      console.error('Error updating recurring expense:', error);
      throw error;
    }
  }

  // Sabit gider silme
  static async deleteRecurringExpense(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, RECURRING_EXPENSES_COLLECTION, id));
    } catch (error) {
      console.error('Error deleting recurring expense:', error);
      throw error;
    }
  }

  // Aktif/Pasif durumu değiştirme
  static async toggleActiveStatus(id: string, isActive: boolean): Promise<void> {
    try {
      await this.updateRecurringExpense(id, { isActive });
    } catch (error) {
      console.error('Error toggling active status:', error);
      throw error;
    }
  }

  // Tüm sabit giderleri getir
  static async getAllRecurringExpenses(): Promise<RecurringExpense[]> {
    try {
      const q = query(
        collection(db, RECURRING_EXPENSES_COLLECTION),
        orderBy('nextDueDate', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const expenses: RecurringExpense[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        expenses.push({
          id: doc.id,
          ...data,
          startDate: data.startDate.toDate(),
          endDate: data.endDate ? data.endDate.toDate() : undefined,
          nextDueDate: data.nextDueDate.toDate(),
          lastProcessedDate: data.lastProcessedDate ? data.lastProcessedDate.toDate() : undefined,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        } as RecurringExpense);
      });
      
      return expenses;
    } catch (error) {
      console.error('Error getting recurring expenses:', error);
      throw error;
    }
  }

  // Şube bazlı sabit giderler
  static async getRecurringExpensesByBranch(branchId: string): Promise<RecurringExpense[]> {
    try {
      const q = query(
        collection(db, RECURRING_EXPENSES_COLLECTION),
        where('branchId', '==', branchId)
      );
      
      const querySnapshot = await getDocs(q);
      const expenses: RecurringExpense[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        expenses.push({
          id: doc.id,
          ...data,
          startDate: data.startDate.toDate(),
          endDate: data.endDate ? data.endDate.toDate() : undefined,
          nextDueDate: data.nextDueDate.toDate(),
          lastProcessedDate: data.lastProcessedDate ? data.lastProcessedDate.toDate() : undefined,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        } as RecurringExpense);
      });
      
      // Client-side sorting by nextDueDate
      return expenses.sort((a, b) => a.nextDueDate.getTime() - b.nextDueDate.getTime());
    } catch (error) {
      console.error('Error getting recurring expenses by branch:', error);
      throw error;
    }
  }

  // Vadesi gelen sabit giderleri getir
  static async getDueRecurringExpenses(date: Date = new Date()): Promise<RecurringExpense[]> {
    try {
      const q = query(
        collection(db, RECURRING_EXPENSES_COLLECTION),
        where('isActive', '==', true),
        where('nextDueDate', '<=', Timestamp.fromDate(date))
      );
      
      const querySnapshot = await getDocs(q);
      const expenses: RecurringExpense[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        expenses.push({
          id: doc.id,
          ...data,
          startDate: data.startDate.toDate(),
          endDate: data.endDate ? data.endDate.toDate() : undefined,
          nextDueDate: data.nextDueDate.toDate(),
          lastProcessedDate: data.lastProcessedDate ? data.lastProcessedDate.toDate() : undefined,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        } as RecurringExpense);
      });
      
      return expenses;
    } catch (error) {
      console.error('Error getting due recurring expenses:', error);
      throw error;
    }
  }

  // Sonraki vade tarihini hesaplama
  static calculateNextDueDate(currentDate: Date, frequency: 'monthly' | 'yearly'): Date {
    const nextDate = new Date(currentDate);
    
    if (frequency === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (frequency === 'yearly') {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    }
    
    return nextDate;
  }

  // Vade tarihini bir sonraki döneme güncelle
  static async updateNextDueDate(expenseId: string): Promise<void> {
    try {
      const expenseDoc = await getDoc(doc(db, RECURRING_EXPENSES_COLLECTION, expenseId));
      if (!expenseDoc.exists()) {
        throw new Error('Recurring expense not found');
      }

      const data = expenseDoc.data();
      const currentNextDue = data.nextDueDate.toDate();
      const newNextDue = this.calculateNextDueDate(currentNextDue, data.frequency);

      await this.updateRecurringExpense(expenseId, {
        nextDueDate: newNextDue,
        lastProcessedDate: new Date()
      });
    } catch (error) {
      console.error('Error updating next due date:', error);
      throw error;
    }
  }

  // Bu ay tahakkuk edecek toplam sabit gider tutarı
  static async getMonthlyTotal(branchId?: string): Promise<number> {
    try {
      const expenses = branchId 
        ? await this.getRecurringExpensesByBranch(branchId)
        : await this.getAllRecurringExpenses();
      
      const monthlyExpenses = expenses.filter(expense => 
        expense.isActive && expense.frequency === 'monthly'
      );
      
      const yearlyExpenses = expenses.filter(expense => 
        expense.isActive && expense.frequency === 'yearly'
      );
      
      const monthlyTotal = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      const yearlyMonthlyTotal = yearlyExpenses.reduce((sum, expense) => sum + (expense.amount / 12), 0);
      
      return monthlyTotal + yearlyMonthlyTotal;
    } catch (error) {
      console.error('Error calculating monthly total:', error);
      throw error;
    }
  }

  // Sabit gider istatistikleri
  static async getRecurringExpenseStats(): Promise<{
    totalActiveExpenses: number;
    totalMonthlyAmount: number;
    totalYearlyAmount: number;
    nextDueExpenses: number;
    overdueExpenses: number;
  }> {
    try {
      const expenses = await this.getAllRecurringExpenses();
      const today = new Date();
      
      const activeExpenses = expenses.filter(expense => expense.isActive);
      const monthlyExpenses = activeExpenses.filter(expense => expense.frequency === 'monthly');
      const yearlyExpenses = activeExpenses.filter(expense => expense.frequency === 'yearly');
      const nextDueExpenses = activeExpenses.filter(expense => {
        const diffTime = expense.nextDueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7 && diffDays >= 0; // Önümüzdeki 7 gün
      });
      const overdueExpenses = activeExpenses.filter(expense => expense.nextDueDate < today);
      
      const totalMonthlyAmount = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      const totalYearlyAmount = yearlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      return {
        totalActiveExpenses: activeExpenses.length,
        totalMonthlyAmount,
        totalYearlyAmount,
        nextDueExpenses: nextDueExpenses.length,
        overdueExpenses: overdueExpenses.length
      };
    } catch (error) {
      console.error('Error getting recurring expense stats:', error);
      throw error;
    }
  }
}