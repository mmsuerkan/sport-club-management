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

export interface StudentDebt {
  id?: string;
  studentId: string;
  studentName: string;
  groupId: string;
  groupName: string;
  branchId: string;
  branchName: string;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue';
  description: string;
  installmentNumber: number; // 1/12, 2/12 etc.
  totalInstallments: number; // 12
  paymentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  academicYear: string; // "2024-2025"
}

const STUDENT_DEBTS_COLLECTION = 'student_debts';

export class StudentDebtService {
  // 12 aylık aidat borcu oluşturma
  static async createYearlyTuition(
    studentId: string,
    studentData: { name: string; groupId: string; groupName: string; branchId: string; branchName: string },
    monthlyAmount: number,
    startDate: Date,
    academicYear: string
  ): Promise<void> {
    try {
      const batch = writeBatch(db);
      const currentDate = new Date(startDate);

      for (let i = 0; i < 12; i++) {
        const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 5); // Her ayın 5'i son ödeme
        
        const debtData: Omit<StudentDebt, 'id'> = {
          studentId,
          studentName: studentData.name,
          groupId: studentData.groupId,
          groupName: studentData.groupName,
          branchId: studentData.branchId,
          branchName: studentData.branchName,
          amount: monthlyAmount,
          dueDate,
          status: 'pending',
          description: `${dueDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} Aidatı`,
          installmentNumber: i + 1,
          totalInstallments: 12,
          createdAt: new Date(),
          updatedAt: new Date(),
          academicYear
        };

        const docRef = doc(collection(db, STUDENT_DEBTS_COLLECTION));
        batch.set(docRef, {
          ...debtData,
          dueDate: Timestamp.fromDate(debtData.dueDate),
          createdAt: Timestamp.fromDate(debtData.createdAt),
          updatedAt: Timestamp.fromDate(debtData.updatedAt),
          paymentDate: null
        });
      }

      await batch.commit();
    } catch (error) {
      console.error('Error creating yearly tuition:', error);
      throw error;
    }
  }

  // Aidat ödeme
  static async markAsPaid(debtId: string): Promise<void> {
    try {
      await updateDoc(doc(db, STUDENT_DEBTS_COLLECTION, debtId), {
        status: 'paid',
        paymentDate: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date())
      });
    } catch (error) {
      console.error('Error marking debt as paid:', error);
      throw error;
    }
  }

  // Aidat ödemeyi geri al
  static async markAsUnpaid(debtId: string): Promise<void> {
    try {
      await updateDoc(doc(db, STUDENT_DEBTS_COLLECTION, debtId), {
        status: 'pending',
        paymentDate: null,
        updatedAt: Timestamp.fromDate(new Date())
      });
    } catch (error) {
      console.error('Error marking debt as unpaid:', error);
      throw error;
    }
  }

  // Tüm borçları getir
  static async getAllDebts(): Promise<StudentDebt[]> {
    try {
      const q = query(
        collection(db, STUDENT_DEBTS_COLLECTION),
        orderBy('dueDate', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const debts: StudentDebt[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        debts.push({
          id: doc.id,
          ...data,
          dueDate: data.dueDate.toDate(),
          paymentDate: data.paymentDate ? data.paymentDate.toDate() : undefined,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        } as StudentDebt);
      });
      
      return debts;
    } catch (error) {
      console.error('Error getting debts:', error);
      throw error;
    }
  }

  // Şube bazlı borçlar
  static async getDebtsByBranch(branchId: string): Promise<StudentDebt[]> {
    try {
      const q = query(
        collection(db, STUDENT_DEBTS_COLLECTION),
        where('branchId', '==', branchId),
        orderBy('dueDate', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const debts: StudentDebt[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        debts.push({
          id: doc.id,
          ...data,
          dueDate: data.dueDate.toDate(),
          paymentDate: data.paymentDate ? data.paymentDate.toDate() : undefined,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        } as StudentDebt);
      });
      
      return debts;
    } catch (error) {
      console.error('Error getting debts by branch:', error);
      throw error;
    }
  }

  // Öğrenci bazlı borçlar
  static async getDebtsByStudent(studentId: string): Promise<StudentDebt[]> {
    try {
      const q = query(
        collection(db, STUDENT_DEBTS_COLLECTION),
        where('studentId', '==', studentId),
        orderBy('dueDate', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const debts: StudentDebt[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        debts.push({
          id: doc.id,
          ...data,
          dueDate: data.dueDate.toDate(),
          paymentDate: data.paymentDate ? data.paymentDate.toDate() : undefined,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        } as StudentDebt);
      });
      
      return debts;
    } catch (error) {
      console.error('Error getting debts by student:', error);
      throw error;
    }
  }

  // Grup bazlı borçlar
  static async getDebtsByGroup(groupId: string): Promise<StudentDebt[]> {
    try {
      const q = query(
        collection(db, STUDENT_DEBTS_COLLECTION),
        where('groupId', '==', groupId),
        orderBy('dueDate', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const debts: StudentDebt[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        debts.push({
          id: doc.id,
          ...data,
          dueDate: data.dueDate.toDate(),
          paymentDate: data.paymentDate ? data.paymentDate.toDate() : undefined,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        } as StudentDebt);
      });
      
      return debts;
    } catch (error) {
      console.error('Error getting debts by group:', error);
      throw error;
    }
  }

  // Aidat istatistikleri
  static async getTuitionStats(): Promise<{
    totalExpected: number;
    totalPaid: number;
    totalPending: number;
    totalOverdue: number;
    paymentRate: number;
  }> {
    try {
      const debts = await this.getAllDebts();
      const today = new Date();
      
      const totalExpected = debts.reduce((sum, debt) => sum + debt.amount, 0);
      const totalPaid = debts.filter(debt => debt.status === 'paid').reduce((sum, debt) => sum + debt.amount, 0);
      const totalPending = debts.filter(debt => debt.status === 'pending' && debt.dueDate > today).reduce((sum, debt) => sum + debt.amount, 0);
      const totalOverdue = debts.filter(debt => debt.status === 'pending' && debt.dueDate <= today).reduce((sum, debt) => sum + debt.amount, 0);
      
      const paymentRate = totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0;
      
      return {
        totalExpected,
        totalPaid,
        totalPending,
        totalOverdue,
        paymentRate
      };
    } catch (error) {
      console.error('Error getting tuition stats:', error);
      throw error;
    }
  }

  // Vadesi geçen borçları güncelle
  static async updateOverdueStatus(): Promise<void> {
    try {
      const today = new Date();
      const q = query(
        collection(db, STUDENT_DEBTS_COLLECTION),
        where('status', '==', 'pending')
      );
      
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const dueDate = data.dueDate.toDate();
        
        if (dueDate <= today) {
          batch.update(doc.ref, {
            status: 'overdue',
            updatedAt: Timestamp.fromDate(new Date())
          });
        }
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error updating overdue status:', error);
      throw error;
    }
  }
}