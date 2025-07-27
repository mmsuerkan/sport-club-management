'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { canTakeAttendance } from '@/lib/firebase/auth';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Calendar, Users, Building, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface AttendanceRecord {
  id: string;
  trainingId: string;
  trainingName: string;
  studentId: string;
  studentName: string;
  trainerId: string;
  trainerName: string;
  branchId: string;
  branchName: string;
  groupId: string;
  groupName: string;
  date: Date;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes: string;
  createdAt: Date;
}

interface Training {
  id: string;
  name: string;
  description?: string;
  trainerId: string;
  trainerName?: string;
  groupId: string;
  groupName?: string;
  branchId: string;
  branchName?: string;
  location?: string;
  date: Date;
  startTime: string;
  endTime: string;
}

export default function ViewAttendancePage() {
  const router = useRouter();
  const params = useParams();
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [training, setTraining] = useState<Training | null>(null);
  
  const attendanceId = params.id as string;

  // Yetki kontrolü
  useEffect(() => {
    if (userData && !canTakeAttendance(userData)) {
      router.push('/unauthorized');
    }
  }, [userData, router]);

  // Yoklama verilerini yükle
  useEffect(() => {
    const loadAttendanceData = async () => {
      if (!userData || !canTakeAttendance(userData) || !attendanceId) {
        setLoading(false);
        return;
      }

      try {
        // Attendance ID'sine göre tüm kayıtları getir
        // attendanceId aslında trainingId'dir, bunu düzeltelim
        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('trainingId', '==', attendanceId)
        );
        const attendanceSnapshot = await getDocs(attendanceQuery);
        
        if (attendanceSnapshot.empty) {
          console.log('Yoklama kaydı bulunamadı');
          setLoading(false);
          return;
        }

        const records: AttendanceRecord[] = [];
        let trainingId = '';

        attendanceSnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Date field'ını güvenli şekilde dönüştür
          let recordDate: Date;
          if (data.date) {
            if (typeof data.date.toDate === 'function') {
              recordDate = data.date.toDate();
            } else if (data.date instanceof Date) {
              recordDate = data.date;
            } else if (typeof data.date === 'string') {
              recordDate = new Date(data.date);
            } else {
              recordDate = new Date();
            }
          } else {
            recordDate = new Date();
          }

          // CreatedAt field'ını güvenli şekilde dönüştür
          let createdAtDate: Date;
          if (data.createdAt) {
            if (typeof data.createdAt.toDate === 'function') {
              createdAtDate = data.createdAt.toDate();
            } else if (data.createdAt instanceof Date) {
              createdAtDate = data.createdAt;
            } else if (typeof data.createdAt === 'string') {
              createdAtDate = new Date(data.createdAt);
            } else {
              createdAtDate = new Date();
            }
          } else {
            createdAtDate = new Date();
          }

          const record: AttendanceRecord = {
            id: doc.id,
            ...data,
            date: recordDate,
            createdAt: createdAtDate,
          } as AttendanceRecord;

          records.push(record);
          if (!trainingId && data.trainingId) {
            trainingId = data.trainingId;
          }
        });

        setAttendanceRecords(records);

        // Antrenman bilgilerini yükle
        if (trainingId) {
          const trainingDoc = await getDoc(doc(db, 'trainings', trainingId));
          if (trainingDoc.exists()) {
            const trainingData = trainingDoc.data();
            
            // Date field'ını güvenli şekilde dönüştür
            let trainingDate: Date;
            if (trainingData.date) {
              if (typeof trainingData.date.toDate === 'function') {
                trainingDate = trainingData.date.toDate();
              } else if (trainingData.date instanceof Date) {
                trainingDate = trainingData.date;
              } else if (typeof trainingData.date === 'string') {
                trainingDate = new Date(trainingData.date);
              } else {
                trainingDate = new Date();
              }
            } else {
              trainingDate = new Date();
            }

            const trainingInfo: Training = {
              id: trainingDoc.id,
              ...trainingData,
              date: trainingDate,
            };
            
            setTraining(trainingInfo);
          }
        }
      } catch (error) {
        console.error('Yoklama verileri yüklenirken hata:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAttendanceData();
  }, [userData, attendanceId]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!canTakeAttendance(userData)) {
    return null;
  }

  if (attendanceRecords.length === 0) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/attendance')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Yoklama Bulunamadı</h1>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Bu ID ile yoklama kaydı bulunamadı.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const firstRecord = attendanceRecords[0];
  const stats = {
    present: attendanceRecords.filter(r => r.status === 'present').length,
    absent: attendanceRecords.filter(r => r.status === 'absent').length,
    late: attendanceRecords.filter(r => r.status === 'late').length,
    excused: attendanceRecords.filter(r => r.status === 'excused').length,
    total: attendanceRecords.length
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-500">Geldi</Badge>;
      case 'absent':
        return <Badge variant="destructive">Gelmedi</Badge>;
      case 'late':
        return <Badge className="bg-yellow-500">Geç Geldi</Badge>;
      case 'excused':
        return <Badge className="bg-blue-500">Mazeretli</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'late':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'excused':
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      {/* Başlık */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboard/attendance')}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {training?.name || firstRecord.trainingName} - Yoklama Sonuçları
          </h1>
          <p className="text-muted-foreground">
            {format(firstRecord.date, 'dd MMMM yyyy, EEEE', { locale: tr })}
          </p>
        </div>
      </div>

      {/* Antrenman Bilgileri */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Antrenman Detayları</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              <span>{firstRecord.branchName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{firstRecord.groupName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Antrenör: {firstRecord.trainerName}</span>
            </div>
            {training && (
              <>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{training.startTime} - {training.endTime}</span>
                </div>
                {training.location && (
                  <div className="flex items-center gap-2">
                    <span>📍 {training.location}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* İstatistikler */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="text-center p-4">
            <div className="text-2xl font-bold text-green-600">{stats.present}</div>
            <div className="text-sm text-muted-foreground">Geldi</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center p-4">
            <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
            <div className="text-sm text-muted-foreground">Gelmedi</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
            <div className="text-sm text-muted-foreground">Geç Geldi</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.excused}</div>
            <div className="text-sm text-muted-foreground">Mazeretli</div>
          </CardContent>
        </Card>
      </div>

      {/* Öğrenci Listesi */}
      <Card>
        <CardHeader>
          <CardTitle>Öğrenci Yoklama Listesi ({stats.total})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {attendanceRecords.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(record.status)}
                  <div>
                    <div className="font-medium">{record.studentName}</div>
                    {record.notes && (
                      <div className="text-sm text-muted-foreground">
                        Not: {record.notes}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(record.status)}
                  <span className="text-xs text-muted-foreground">
                    {format(record.createdAt, 'HH:mm')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}