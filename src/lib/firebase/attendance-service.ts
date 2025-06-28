import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './config';

export interface AttendanceRecord {
  id: string;
  trainingId: string;
  trainingName: string;
  studentId: string;
  studentName: string;
  branchId: string;
  branchName: string;
  groupId: string;
  groupName: string;
  date: Date;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes: string;
  recordedBy: string;
  recordedAt: Date;
}

export interface AttendanceSession {
  id: string;
  trainingId: string;
  trainingName: string;
  branchId: string;
  branchName: string;
  groupId: string;
  groupName: string;
  date: Date;
  trainerId: string;
  trainerName: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  isCompleted: boolean;
  completedAt?: Date;
  notes: string;
}

export interface AttendanceStats {
  totalSessions: number;
  totalStudents: number;
  averageAttendance: number;
  presentTotal: number;
  absentTotal: number;
  lateTotal: number;
  excusedTotal: number;
}

class AttendanceService {
  // Get all attendance sessions
  async getAttendanceSessions(filters?: {
    branchId?: string;
    groupId?: string;
    trainerId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AttendanceSession[]> {
    try {
      let q = collection(db, 'attendanceSessions');
      
      if (filters) {
        const constraints = [];
        
        if (filters.branchId) {
          constraints.push(where('branchId', '==', filters.branchId));
        }
        
        if (filters.groupId) {
          constraints.push(where('groupId', '==', filters.groupId));
        }
        
        if (filters.trainerId) {
          constraints.push(where('trainerId', '==', filters.trainerId));
        }
        
        if (filters.startDate) {
          constraints.push(where('date', '>=', Timestamp.fromDate(filters.startDate)));
        }
        
        if (filters.endDate) {
          constraints.push(where('date', '<=', Timestamp.fromDate(filters.endDate)));
        }
        
        if (constraints.length > 0) {
          q = query(collection(db, 'attendanceSessions'), ...constraints, orderBy('date', 'desc'));
        }
      } else {
        q = query(collection(db, 'attendanceSessions'), orderBy('date', 'desc'));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
        completedAt: doc.data().completedAt?.toDate()
      })) as AttendanceSession[];
    } catch (error) {
      console.error('Error fetching attendance sessions:', error);
      throw error;
    }
  }

  // Get attendance records for a session
  async getAttendanceRecords(sessionId: string): Promise<AttendanceRecord[]> {
    try {
      const q = query(
        collection(db, 'attendanceRecords'),
        where('trainingId', '==', sessionId.split('_')[0]),
        orderBy('studentName')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
        recordedAt: doc.data().recordedAt?.toDate() || new Date()
      })) as AttendanceRecord[];
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      throw error;
    }
  }

  // Save attendance session and records
  async saveAttendanceSession(
    session: AttendanceSession, 
    records: AttendanceRecord[]
  ): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      // Add session to batch
      const sessionRef = doc(db, 'attendanceSessions', session.id);
      batch.set(sessionRef, {
        ...session,
        date: Timestamp.fromDate(session.date),
        completedAt: session.completedAt ? Timestamp.fromDate(session.completedAt) : null
      });
      
      // Add records to batch
      records.forEach(record => {
        const recordRef = doc(db, 'attendanceRecords', record.id);
        batch.set(recordRef, {
          ...record,
          date: Timestamp.fromDate(record.date),
          recordedAt: Timestamp.fromDate(record.recordedAt)
        });
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error saving attendance session:', error);
      throw error;
    }
  }

  // Update attendance record
  async updateAttendanceRecord(
    recordId: string, 
    updates: Partial<AttendanceRecord>
  ): Promise<void> {
    try {
      const recordRef = doc(db, 'attendanceRecords', recordId);
      const updateData = { ...updates };
      
      if (updates.date) {
        updateData.date = Timestamp.fromDate(updates.date);
      }
      
      if (updates.recordedAt) {
        updateData.recordedAt = Timestamp.fromDate(updates.recordedAt);
      }
      
      await updateDoc(recordRef, updateData);
    } catch (error) {
      console.error('Error updating attendance record:', error);
      throw error;
    }
  }

  // Get attendance statistics
  async getAttendanceStats(filters?: {
    branchId?: string;
    groupId?: string;
    trainerId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AttendanceStats> {
    try {
      const sessions = await this.getAttendanceSessions(filters);
      
      const stats: AttendanceStats = {
        totalSessions: sessions.length,
        totalStudents: sessions.reduce((sum, session) => sum + session.totalStudents, 0),
        averageAttendance: 0,
        presentTotal: sessions.reduce((sum, session) => sum + session.presentCount, 0),
        absentTotal: sessions.reduce((sum, session) => sum + session.absentCount, 0),
        lateTotal: sessions.reduce((sum, session) => sum + session.lateCount, 0),
        excusedTotal: sessions.reduce((sum, session) => sum + session.excusedCount, 0)
      };
      
      if (stats.totalStudents > 0) {
        stats.averageAttendance = (stats.presentTotal / stats.totalStudents) * 100;
      }
      
      return stats;
    } catch (error) {
      console.error('Error calculating attendance stats:', error);
      throw error;
    }
  }

  // Get student attendance history
  async getStudentAttendanceHistory(
    studentId: string, 
    limit?: number
  ): Promise<AttendanceRecord[]> {
    try {
      let q = query(
        collection(db, 'attendanceRecords'),
        where('studentId', '==', studentId),
        orderBy('date', 'desc')
      );
      
      if (limit) {
        q = query(q, limit(limit));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date(),
        recordedAt: doc.data().recordedAt?.toDate() || new Date()
      })) as AttendanceRecord[];
    } catch (error) {
      console.error('Error fetching student attendance history:', error);
      throw error;
    }
  }

  // Delete attendance session and all related records
  async deleteAttendanceSession(sessionId: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      // Delete session
      const sessionRef = doc(db, 'attendanceSessions', sessionId);
      batch.delete(sessionRef);
      
      // Get and delete all related records
      const recordsQuery = query(
        collection(db, 'attendanceRecords'),
        where('trainingId', '==', sessionId.split('_')[0])
      );
      
      const recordsSnapshot = await getDocs(recordsQuery);
      recordsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error deleting attendance session:', error);
      throw error;
    }
  }

  // Get attendance summary by date range
  async getAttendanceSummaryByDateRange(
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<{date: string, present: number, absent: number, total: number}[]> {
    try {
      const sessions = await this.getAttendanceSessions({
        startDate,
        endDate
      });
      
      const summary: {[key: string]: {present: number, absent: number, total: number}} = {};
      
      sessions.forEach(session => {
        let dateKey: string;
        const sessionDate = session.date;
        
        switch (groupBy) {
          case 'week':
            const startOfWeek = new Date(sessionDate);
            startOfWeek.setDate(sessionDate.getDate() - sessionDate.getDay());
            dateKey = startOfWeek.toISOString().split('T')[0];
            break;
          case 'month':
            dateKey = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}`;
            break;
          default:
            dateKey = sessionDate.toISOString().split('T')[0];
        }
        
        if (!summary[dateKey]) {
          summary[dateKey] = { present: 0, absent: 0, total: 0 };
        }
        
        summary[dateKey].present += session.presentCount;
        summary[dateKey].absent += session.absentCount + session.lateCount + session.excusedCount;
        summary[dateKey].total += session.totalStudents;
      });
      
      return Object.entries(summary)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('Error getting attendance summary:', error);
      throw error;
    }
  }

  // Create attendance session from training
  async createAttendanceSessionFromTraining(training: {
    id: string;
    name: string;
    branchId: string;
    branchName?: string;
    groupId: string;
    groupName?: string;
    trainerId: string;
    trainerName?: string;
    date: Date;
  }): Promise<string> {
    try {
      const sessionId = `${training.id}_${training.date}`;
      
      // Check if session already exists
      const existingSession = await getDoc(doc(db, 'attendanceSessions', sessionId));
      if (existingSession.exists()) {
        return sessionId; // Session already exists
      }

      const session: AttendanceSession = {
        id: sessionId,
        trainingId: training.id,
        trainingName: training.name,
        branchId: training.branchId,
        branchName: training.branchName || '',
        groupId: training.groupId,
        groupName: training.groupName || '',
        date: new Date(training.date),
        trainerId: training.trainerId,
        trainerName: training.trainerName || '',
        totalStudents: 0, // Will be updated when attendance is taken
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        excusedCount: 0,
        isCompleted: false,
        notes: ''
      };

      await setDoc(doc(db, 'attendanceSessions', sessionId), {
        ...session,
        date: Timestamp.fromDate(session.date)
      });

      return sessionId;
    } catch (error) {
      console.error('Error creating attendance session from training:', error);
      throw error;
    }
  }

  // Get pending attendance sessions
  async getPendingAttendanceSessions(date?: Date): Promise<AttendanceSession[]> {
    try {
      let q;
      if (date) {
        // Get sessions for specific date
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        q = query(
          collection(db, 'attendanceSessions'),
          where('isCompleted', '==', false),
          where('date', '>=', Timestamp.fromDate(startOfDay)),
          where('date', '<=', Timestamp.fromDate(endOfDay)),
          orderBy('date', 'asc')
        );
      } else {
        // Get all pending sessions
        q = query(
          collection(db, 'attendanceSessions'),
          where('isCompleted', '==', false),
          orderBy('date', 'asc')
        );
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date()
      })) as AttendanceSession[];
    } catch (error) {
      console.error('Error fetching pending attendance sessions:', error);
      throw error;
    }
  }

  // Get attendance session by training ID and date
  async getAttendanceSessionByTraining(trainingId: string, date: string): Promise<AttendanceSession | null> {
    try {
      const sessionId = `${trainingId}_${date}`;
      const sessionDoc = await getDoc(doc(db, 'attendanceSessions', sessionId));
      
      if (!sessionDoc.exists()) {
        return null;
      }

      const data = sessionDoc.data();
      return {
        id: sessionDoc.id,
        ...data,
        date: data.date?.toDate() || new Date(),
        completedAt: data.completedAt?.toDate()
      } as AttendanceSession;
    } catch (error) {
      console.error('Error fetching attendance session by training:', error);
      return null;
    }
  }
}

export const attendanceService = new AttendanceService();