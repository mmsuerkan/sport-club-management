'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canTakeAttendance, isTrainer } from '@/lib/firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, Users, Search, Clock, CheckCircle, AlertCircle, Dumbbell } from 'lucide-react';
import { collection, getDocs, query, where, orderBy, Timestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import LoadingSpinner from '@/components/LoadingSpinner';
import { format, isToday, isPast, isFuture } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import PageTitle from '@/components/page-title';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';

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
  maxParticipants?: number;
  currentParticipants?: number;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt?: Date;
  // Yoklama durumu
  attendanceTaken?: boolean;
  attendanceId?: string;
}

interface AttendanceRecord {
  id: string;
  trainingId: string;
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

interface AttendanceSession {
  id: string;
  trainingId: string;
  trainingName: string;
  trainerId: string;
  trainerName: string;
  branchId: string;
  branchName: string;
  groupId: string;
  groupName: string;
  date: Date;
  startTime: string;
  endTime: string;
  records: AttendanceRecord[];
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  totalCount: number;
  isCompleted: boolean;
  completedAt?: Date;
}

export default function AttendancePage() {
  const { userData } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [filteredTrainings, setFilteredTrainings] = useState<Training[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'today' | 'upcoming' | 'completed'>('today');

  // Yetki kontrolü
  useEffect(() => {
    if (!loading && userData && !canTakeAttendance(userData)) {
      router.push('/unauthorized');
    }
  }, [userData, loading, router]);

  // Antrenör ID'sini bul
  useEffect(() => {
    const findTrainerId = async () => {
      if (userData && isTrainer(userData)) {
        
        // Antrenör rolündeyse, email ile trainers koleksiyonundan ID'yi bul
        const trainersQuery = query(
          collection(db, 'trainers'),
          where('email', '==', userData.email)
        );
        const trainersSnapshot = await getDocs(trainersQuery);
        if (!trainersSnapshot.empty) {
          const foundTrainerId = trainersSnapshot.docs[0].id;
          setTrainerId(foundTrainerId);
        }
      }
    };

    if (userData) {
      findTrainerId();
    }
  }, [userData]);

  // Antrenmanları ve yoklama durumlarını yükle
  useEffect(() => {
    const loadTrainingsAndAttendance = async () => {
      if (!userData || !canTakeAttendance(userData)) {
        setLoading(false);
        return;
      }

      try {
        let trainingsQuery;
        
        // Eğer antrenörse sadece kendi antrenmanlarını göster
        if (isTrainer(userData) && trainerId) {
          trainingsQuery = query(
            collection(db, 'trainings'),
            where('trainerId', '==', trainerId),
            orderBy('date', 'desc')
          );
        } else if (isTrainer(userData) && !trainerId) {
          setLoading(false);
          return;
        } else {
          // Admin ise tüm antrenmanları göster
          trainingsQuery = query(
            collection(db, 'trainings'),
            orderBy('date', 'desc')
          );
        }

        const trainingsSnapshot = await getDocs(trainingsQuery);
        const trainingsData: Training[] = [];

        // Antrenmanları yükle
        for (const docSnap of trainingsSnapshot.docs) {
          const data = docSnap.data();
          
          // Date field'ını güvenli şekilde dönüştür
          let trainingDate: Date;
          if (data.date) {
            if (typeof data.date.toDate === 'function') {
              // Firestore Timestamp
              trainingDate = data.date.toDate();
            } else if (data.date instanceof Date) {
              // JavaScript Date
              trainingDate = data.date;
            } else if (typeof data.date === 'string') {
              // String date
              trainingDate = new Date(data.date);
            } else {
              trainingDate = new Date();
            }
          } else {
            trainingDate = new Date();
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
          
          const training: Training = {
            id: docSnap.id,
            ...data,
            date: trainingDate,
            createdAt: createdAtDate,
            attendanceTaken: false
          };

          // Bu antrenman için yoklama alınmış mı kontrol et
          const attendanceQuery = query(
            collection(db, 'attendance'),
            where('trainingId', '==', training.id)
          );
          const attendanceSnapshot = await getDocs(attendanceQuery);
          
          if (!attendanceSnapshot.empty) {
            training.attendanceTaken = true;
            training.attendanceId = attendanceSnapshot.docs[0].id;
          }

          trainingsData.push(training);
        }

        
        setTrainings(trainingsData);
        setFilteredTrainings(trainingsData);
        
        // Yoklama oturumlarını da yükle (geçmiş kayıtlar için)
        await loadAttendanceSessions();
      } catch (error) {
        console.error('Antrenmanlar yüklenirken hata:', error);
      } finally {
        setLoading(false);
      }
    };

    const loadAttendanceSessions = async () => {
      try {
        let attendanceQuery;
        
        if (isTrainer(userData) && trainerId) {
          attendanceQuery = query(
            collection(db, 'attendance'),
            where('trainerId', '==', trainerId),
            orderBy('date', 'desc')
          );
        } else {
          attendanceQuery = query(
            collection(db, 'attendance'),
            orderBy('date', 'desc')
          );
        }

        const snapshot = await getDocs(attendanceQuery);
        const records: AttendanceRecord[] = [];

        snapshot.forEach((doc) => {
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
          
          records.push({
            id: doc.id,
            ...data,
            date: recordDate,
            createdAt: createdAtDate,
          } as AttendanceRecord);
        });

        // Kayıtları oturumlara grupla
        const sessionsMap = new Map<string, AttendanceSession>();
        
        records.forEach((record) => {
          const sessionKey = record.trainingId || `${format(record.date, 'yyyy-MM-dd')}_${record.groupId}_${record.trainerId}`;
          
          if (!sessionsMap.has(sessionKey)) {
            sessionsMap.set(sessionKey, {
              id: sessionKey,
              trainingId: record.trainingId || '',
              trainingName: record.trainingName || 'Antrenman',
              trainerId: record.trainerId,
              trainerName: record.trainerName,
              branchId: record.branchId,
              branchName: record.branchName,
              groupId: record.groupId,
              groupName: record.groupName,
              date: record.date,
              startTime: '',
              endTime: '',
              records: [],
              presentCount: 0,
              absentCount: 0,
              lateCount: 0,
              excusedCount: 0,
              totalCount: 0,
              isCompleted: true,
              completedAt: record.createdAt
            });
          }

          const session = sessionsMap.get(sessionKey)!;
          session.records.push(record);
          session.totalCount++;

          switch (record.status) {
            case 'present':
              session.presentCount++;
              break;
            case 'absent':
              session.absentCount++;
              break;
            case 'late':
              session.lateCount++;
              break;
            case 'excused':
              session.excusedCount++;
              break;
          }
        });

        const sessions = Array.from(sessionsMap.values()).sort(
          (a, b) => b.date.getTime() - a.date.getTime()
        );

        setAttendanceSessions(sessions);
      } catch (error) {
        console.error('Yoklama oturumları yüklenirken hata:', error);
      }
    };

    if (userData && (trainerId || !isTrainer(userData))) {
      loadTrainingsAndAttendance();
    }
  }, [userData, trainerId]);

  // Arama ve filtreleme işlevi
  useEffect(() => {
    let filtered = trainings;

    // Tab filtreleme
    const now = new Date();
    switch (selectedTab) {
      case 'today':
        filtered = filtered.filter(training => isToday(training.date));
        break;
      case 'upcoming':
        filtered = filtered.filter(training => isFuture(training.date));
        break;
      case 'completed':
        filtered = filtered.filter(training => 
          isPast(training.date) && training.attendanceTaken
        );
        break;
    }

    // Arama filtreleme
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(training => 
        training.name.toLowerCase().includes(searchLower) ||
        training.groupName?.toLowerCase().includes(searchLower) ||
        training.branchName?.toLowerCase().includes(searchLower) ||
        training.trainerName?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredTrainings(filtered);
  }, [searchQuery, trainings, selectedTab]);

  const getTrainingStatusBadge = (training: Training) => {
    if (training.attendanceTaken) {
      return <Badge className="bg-green-500">Yoklama Alındı</Badge>;
    }
    
    if (isToday(training.date)) {
      return <Badge className="bg-blue-500">Bugün</Badge>;
    }
    
    if (isPast(training.date)) {
      return <Badge variant="destructive">Yoklama Alınmadı</Badge>;
    }
    
    return <Badge variant="outline">Gelecek</Badge>;
  };

  const handleTakeAttendance = (training: Training) => {
    router.push(`/dashboard/attendance/take?trainingId=${training.id}`);
  };

  const getTrainingStats = () => {
    const today = trainings.filter(t => isToday(t.date));
    const upcoming = trainings.filter(t => isFuture(t.date));
    const completed = trainings.filter(t => isPast(t.date) && t.attendanceTaken);
    const pending = trainings.filter(t => isPast(t.date) && !t.attendanceTaken);
    
    return { today, upcoming, completed, pending };
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!canTakeAttendance(userData)) {
    return null;
  }

  const stats = getTrainingStats();

  return (
    <div>
      <PageTitle
        pageTitle="Yoklama Takip"
        pageDescription={isTrainer(userData) 
            ? 'Antrenmanlarınız için yoklama alın ve görüntüleyin' 
            : 'Tüm antrenmanlar için yoklama kayıtlarını yönetin'}
        pageIcon={<FactCheckOutlinedIcon />}
      />

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Bugünkü Antrenmanlar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Gelecek Antrenmanlar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcoming.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Tamamlanan Yoklamalar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Bekleyen Yoklamalar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.pending.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigasyonu */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6">
        <Button
          variant={selectedTab === 'today' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSelectedTab('today')}
          className="flex-1"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Bugün ({stats.today.length})
        </Button>
        <Button
          variant={selectedTab === 'upcoming' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSelectedTab('upcoming')}
          className="flex-1"
        >
          <Clock className="h-4 w-4 mr-2" />
          Gelecek ({stats.upcoming.length})
        </Button>
        <Button
          variant={selectedTab === 'completed' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSelectedTab('completed')}
          className="flex-1"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Tamamlanan ({stats.completed.length})
        </Button>
      </div>

      {/* Arama */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Antrenman, grup, şube veya antrenör ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Antrenman Listesi */}
      <div className="space-y-4">
        {filteredTrainings.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Dumbbell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? 'Arama kriterlerine uygun antrenman bulunamadı.'
                  : selectedTab === 'today'
                  ? 'Bugün antrenman bulunmuyor.'
                  : selectedTab === 'upcoming'
                  ? 'Gelecek antrenman bulunmuyor.'
                  : 'Tamamlanan yoklama bulunmuyor.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTrainings.map((training) => (
            <Card
              key={training.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Dumbbell className="h-5 w-5 text-gray-500" />
                      <CardTitle className="text-lg">{training.name}</CardTitle>
                      {getTrainingStatusBadge(training)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(training.date, 'dd MMMM yyyy, EEEE', { locale: tr })}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {training.startTime} - {training.endTime}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {training.groupName} - {training.branchName}
                        </div>
                      </div>
                      {training.description && (
                        <div className="mt-2 text-gray-600">
                          {training.description}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    Antrenör: {training.trainerName}
                  </div>
                  <div className="flex gap-2">
                    {training.attendanceTaken ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/attendance/view/${training.id}`)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Yoklamayı Görüntüle
                      </Button>
                    ) : isPast(training.date) || isToday(training.date) ? (
                      <Button
                        onClick={() => handleTakeAttendance(training)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Yoklama Al
                      </Button>
                    ) : (
                      <Badge variant="outline">
                        Henüz Zamanı Gelmedi
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}