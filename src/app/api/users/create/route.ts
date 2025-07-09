import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { UserRole } from '@/lib/firebase/auth';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { email, password, userData, adminId } = data;

    // Firebase Admin SDK ile kullanıcı oluştur
    const userRecord = await adminAuth.createUser({
      email,
      password,
      emailVerified: false,
      disabled: false,
    });

    // Firestore'a kullanıcı verilerini kaydet
    const userDocData: any = {
      email,
      name: userData.name,
      role: userData.role,
      clubId: userData.clubId || '',
      branchIds: userData.branchIds || [],
      isActive: userData.isActive,
      createdAt: new Date(),
      createdBy: adminId,
      phone: userData.phone || ''
    };

    // Optional fields
    if (userData.studentId) userDocData.studentId = userData.studentId;
    if (userData.parentId) userDocData.parentId = userData.parentId;
    if (userData.children) userDocData.children = userData.children;

    await adminDb.collection('users').doc(userRecord.uid).set(userDocData);

    return NextResponse.json({ 
      success: true, 
      user: {
        uid: userRecord.uid,
        email: userRecord.email
      }
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    
    let errorMessage = 'Kullanıcı oluşturulamadı';
    
    if (error?.code === 'auth/email-already-exists') {
      errorMessage = 'Bu email adresi zaten kullanılıyor';
    } else if (error?.code === 'auth/invalid-email') {
      errorMessage = 'Geçersiz email adresi';
    } else if (error?.code === 'auth/invalid-password') {
      errorMessage = 'Şifre en az 6 karakter olmalıdır';
    }
    
    return NextResponse.json({ 
      error: errorMessage 
    }, { status: 400 });
  }
}