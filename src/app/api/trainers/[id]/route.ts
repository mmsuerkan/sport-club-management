import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const data = await request.json();
    
    await adminDb.collection('trainers').doc(id).update(data);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating trainer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}