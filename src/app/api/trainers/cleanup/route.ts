import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';

export async function POST() {
  try {
    // Tüm antrenörleri al
    const trainersSnapshot = await adminDb.collection('trainers').get();
    
    let cleanedCount = 0;
    const FieldValue = await import('firebase-admin/firestore').then(m => m.FieldValue);
    
    for (const doc of trainersSnapshot.docs) {
      const trainerData = doc.data();
      
      // Eğer userId varsa, bu kullanıcı gerçekten var mı kontrol et
      if (trainerData.userId) {
        try {
          // Firebase Auth'ta kullanıcı var mı kontrol et
          await adminAuth.getUser(trainerData.userId);
          // Kullanıcı varsa, userId'yi koru
        } catch (error: any) {
          if (error.code === 'auth/user-not-found') {
            // Kullanıcı Auth'ta yoksa, userId'yi sil
            await doc.ref.update({ userId: FieldValue.delete() });
            cleanedCount++;
            console.log(`Cleaned userId from trainer: ${trainerData.fullName || trainerData.name}`);
          }
        }
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `${cleanedCount} antrenör kaydı temizlendi` 
    });
  } catch (error) {
    console.error('Error cleaning trainers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}