import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const { email, secret } = await request.json();
    
    // Basit güvenlik - production'da kaldır
    if (secret !== 'temp-admin-secret-123') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Email ile kullanıcıyı bul
    const userRecord = await adminAuth.getUserByEmail(email);
    
    // Firestore'da rolü güncelle
    await adminDb.collection('users').doc(userRecord.uid).update({
      role: 'ADMIN'
    });
    
    return NextResponse.json({ 
      success: true, 
      message: `${email} ADMIN rolüne yükseltildi` 
    });
  } catch (error) {
    console.error('Error making admin:', error);
    return NextResponse.json({ 
      error: 'Kullanıcı bulunamadı veya güncellenemedi' 
    }, { status: 500 });
  }
}