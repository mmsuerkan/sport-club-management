import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';

export async function POST() {
  try {
    // Tüm öğrencileri al
    const studentsSnapshot = await adminDb.collection('students').get();
    
    let cleanedCount = 0;
    const FieldValue = await import('firebase-admin/firestore').then(m => m.FieldValue);
    
    for (const doc of studentsSnapshot.docs) {
      const studentData = doc.data();
      
      // userId kontrolü
      if (studentData.userId) {
        try {
          await adminAuth.getUser(studentData.userId);
        } catch (error: any) {
          if (error.code === 'auth/user-not-found') {
            await doc.ref.update({ userId: FieldValue.delete() });
            cleanedCount++;
            console.log(`Cleaned userId from student: ${studentData.fullName || studentData.name}`);
          }
        }
      }
      
      // parentId kontrolü
      if (studentData.parentId) {
        try {
          await adminAuth.getUser(studentData.parentId);
        } catch (error: any) {
          if (error.code === 'auth/user-not-found') {
            await doc.ref.update({ parentId: FieldValue.delete() });
            cleanedCount++;
            console.log(`Cleaned parentId from student: ${studentData.fullName || studentData.name}`);
          }
        }
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `${cleanedCount} öğrenci kaydı temizlendi` 
    });
  } catch (error) {
    console.error('Error cleaning students:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}