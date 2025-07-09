import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Firebase Auth'tan kullanıcıyı sil
    try {
      await adminAuth.deleteUser(id);
    } catch (authError: any) {
      // Kullanıcı Auth'ta yoksa devam et
      if (authError.code !== 'auth/user-not-found') {
        throw authError;
      }
    }
    
    // Firestore'dan kullanıcı verisini sil
    await adminDb.collection('users').doc(id).delete();
    
    // İlişkili kayıtların bağlantılarını temizle
    // Antrenör kaydındaki userId'yi temizle
    const trainersSnapshot = await adminDb.collection('trainers')
      .where('userId', '==', id)
      .get();
    
    const FieldValue = await import('firebase-admin/firestore').then(m => m.FieldValue);
    
    for (const doc of trainersSnapshot.docs) {
      await doc.ref.update({ userId: FieldValue.delete() });
    }
    
    // Öğrenci kaydındaki userId'yi temizle
    const studentsSnapshot = await adminDb.collection('students')
      .where('userId', '==', id)
      .get();
    
    for (const doc of studentsSnapshot.docs) {
      await doc.ref.update({ userId: FieldValue.delete() });
    }
    
    // Veli ise, öğrenci kayıtlarındaki parentId'yi temizle
    const childrenSnapshot = await adminDb.collection('students')
      .where('parentId', '==', id)
      .get();
    
    for (const doc of childrenSnapshot.docs) {
      await doc.ref.update({ parentId: FieldValue.delete() });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}