import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET() {
  try {
    const trainersSnapshot = await adminDb.collection('trainers').get();
    
    const trainers = trainersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return NextResponse.json(trainers);
  } catch (error) {
    console.error('Error fetching trainers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}