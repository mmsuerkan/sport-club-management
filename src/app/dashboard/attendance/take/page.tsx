'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { canTakeAttendance, isTrainer } from '@/lib/firebase/auth';
import { collection, getDocs, query, where, addDoc, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Users, Building, ChevronLeft, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Student {
  id: string;
  fullName: string;
  branchId: string;
  branchName: string;
  groupId: string;
  groupName: string;
}

interface Branch {
  id: string;
  name: string;
}

interface Group {
  id: string;
  name: string;
  branchId: string;
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
  maxParticipants?: number;
  currentParticipants?: number;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt?: Date;
}

interface AttendanceItem {
  student: Student;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes: string;
}

function TakeAttendanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [trainerName, setTrainerName] = useState<string>('');
  const [training, setTraining] = useState<Training | null>(null);

  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceList, setAttendanceList] = useState<AttendanceItem[]>([]);
  
  // URL'den trainingId'yi al
  const trainingId = searchParams.get('trainingId');

  // Yetki kontrolü
  useEffect(() => {
    if (userData && !canTakeAttendance(userData)) {
      router.push('/unauthorized');
    }
  }, [userData, router]);

  // Antrenör bilgilerini yükle
  useEffect(() => {
    const loadTrainerInfo = async () => {
      if (userData && isTrainer(userData)) {
        try {
          // Email ile antrenör kaydını bul
          const trainersQuery = query(
            collection(db, 'trainers'),
            where('email', '==', userData.email)
          );
          const trainersSnapshot = await getDocs(trainersQuery);
          
          if (!trainersSnapshot.empty) {
            const trainerDoc = trainersSnapshot.docs[0];
            const trainerData = trainerDoc.data();
            setTrainerId(trainerDoc.id);
            setTrainerName(trainerData.fullName || userData.name || 'Antrenör');
          } else {
            // Eğer email ile bulunamazsa, userId ile dene
            const trainersByUserId = query(
              collection(db, 'trainers'),
              where('userId', '==', userData.uid)
            );
            const userIdSnapshot = await getDocs(trainersByUserId);
            
            if (!userIdSnapshot.empty) {
              const trainerDoc = userIdSnapshot.docs[0];
              const trainerData = trainerDoc.data();
              setTrainerId(trainerDoc.id);
              setTrainerName(trainerData.fullName || userData.name || 'Antrenör');
            }
          }
        } catch (error) {
          console.error('Antrenör bilgileri yüklenirken hata:', error);
        }
      } else if (userData) {
        // Admin ise
        setTrainerName(userData.name || 'Admin');
      }
    };

    if (userData) {
      loadTrainerInfo();
    }
  }, [userData]);

  // Antrenman bilgilerini yükle (eğer trainingId varsa)
  useEffect(() => {
    const loadTrainingData = async () => {
      if (trainingId) {
        try {
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

            // CreatedAt field'ını güvenli şekilde dönüştür
            let createdAtDate: Date;
            if (trainingData.createdAt) {
              if (typeof trainingData.createdAt.toDate === 'function') {
                createdAtDate = trainingData.createdAt.toDate();
              } else if (trainingData.createdAt instanceof Date) {
                createdAtDate = trainingData.createdAt;
              } else if (typeof trainingData.createdAt === 'string') {
                createdAtDate = new Date(trainingData.createdAt);
              } else {
                createdAtDate = new Date();
              }
            } else {
              createdAtDate = new Date();
            }
            
            const trainingInfo: Training = {
              id: trainingDoc.id,
              ...trainingData,
              date: trainingDate,
              createdAt: createdAtDate,
            };
            
            setTraining(trainingInfo);
            
            // Antrenman tarihini set et
            setAttendanceDate(trainingInfo.date.toISOString().split('T')[0]);
            
            // Branch ve Group bilgilerini otomatik seç
            setSelectedBranchId(trainingInfo.branchId);
            setSelectedGroupId(trainingInfo.groupId);
          }
        } catch (error) {
          console.error('Antrenman bilgileri yüklenirken hata:', error);
        }
      }
    };
    
    loadTrainingData();
  }, [trainingId]);

  // İlk veri yüklemesi
  useEffect(() => {
    loadInitialData();
  }, [userData, trainerId]);

  // Grup değiştiğinde öğrencileri yükle
  useEffect(() => {
    if (selectedGroupId) {
      loadStudents();
    }
  }, [selectedGroupId]);

  const loadInitialData = async () => {
    if (!userData || !canTakeAttendance(userData)) {
      setLoading(false);
      return;
    }

    try {
      // Şubeleri yükle
      let branchesData: Branch[] = [];
      
      if (isTrainer(userData) && trainerId) {
        // Antrenörse sadece kendi şubelerini göster
        const trainerDoc = await getDoc(doc(db, 'trainers', trainerId));
        if (trainerDoc.exists()) {
          const trainerData = trainerDoc.data();
          if (trainerData.branchId) {
            const branchDoc = await getDoc(doc(db, 'branches', trainerData.branchId));
            if (branchDoc.exists()) {
              branchesData = [{
                id: branchDoc.id,
                name: branchDoc.data().name
              }];
              // Otomatik olarak seç
              setSelectedBranchId(branchDoc.id);
            }
          }
        }
      } else {
        // Admin ise tüm şubeleri göster
        const branchesSnapshot = await getDocs(collection(db, 'branches'));
        branchesSnapshot.forEach((doc) => {
          branchesData.push({
            id: doc.id,
            name: doc.data().name
          });
        });
      }
      
      setBranches(branchesData);
      
      // Grupları yükle
      if (branchesData.length > 0) {
        await loadGroups(branchesData[0].id);
      }
    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async (branchId: string) => {
    try {
      let groupsData: Group[] = [];
      
      if (isTrainer(userData) && trainerId) {
        // Antrenörse sadece kendi gruplarını göster
        const trainerDoc = await getDoc(doc(db, 'trainers', trainerId));
        if (trainerDoc.exists()) {
          const trainerData = trainerDoc.data();
          if (trainerData.groupIds && trainerData.groupIds.length > 0) {
            // Antrenörün gruplarını yükle
            for (const groupId of trainerData.groupIds) {
              const groupDoc = await getDoc(doc(db, 'groups', groupId));
              if (groupDoc.exists() && groupDoc.data().branchId === branchId) {
                groupsData.push({
                  id: groupDoc.id,
                  ...groupDoc.data()
                } as Group);
              }
            }
          }
        }
      } else {
        // Admin ise şubeye ait tüm grupları göster
        const groupsQuery = query(
          collection(db, 'groups'),
          where('branchId', '==', branchId)
        );
        const groupsSnapshot = await getDocs(groupsQuery);
        groupsSnapshot.forEach((doc) => {
          groupsData.push({
            id: doc.id,
            ...doc.data()
          } as Group);
        });
      }
      
      setGroups(groupsData);
    } catch (error) {
      console.error('Gruplar yüklenirken hata:', error);
      setGroups([]);
    }
  };

  const loadStudents = async () => {
    try {
      const studentsQuery = query(
        collection(db, 'students'),
        where('groupId', '==', selectedGroupId)
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsData: Student[] = [];
      
      studentsSnapshot.forEach((doc) => {
        studentsData.push({
          id: doc.id,
          ...doc.data()
        } as Student);
      });
      
      setStudents(studentsData);
      
      // Yoklama listesini oluştur
      const initialAttendance = studentsData.map(student => ({
        student,
        status: 'present' as const,
        notes: ''
      }));
      setAttendanceList(initialAttendance);
    } catch (error) {
      console.error('Öğrenciler yüklenirken hata:', error);
    }
  };

  const handleStatusChange = (index: number, status: AttendanceItem['status']) => {
    const updatedList = [...attendanceList];
    updatedList[index].status = status;
    setAttendanceList(updatedList);
  };

  const handleNotesChange = (index: number, notes: string) => {
    const updatedList = [...attendanceList];
    updatedList[index].notes = notes;
    setAttendanceList(updatedList);
  };

  const handleSave = async () => {
    if (!selectedBranchId || !selectedGroupId || attendanceList.length === 0) {
      alert('Lütfen tüm alanları doldurun.');
      return;
    }

    setSaving(true);
    try {
      const selectedBranch = branches.find(b => b.id === selectedBranchId);
      const selectedGroup = groups.find(g => g.id === selectedGroupId);

      // Her öğrenci için yoklama kaydı oluştur
      const promises = attendanceList.map(item =>
        addDoc(collection(db, 'attendance'), {
          trainingId: trainingId || '', // Antrenman ID'sini ekle
          trainingName: training?.name || 'Antrenman', // Antrenman adını ekle
          studentId: item.student.id,
          studentName: item.student.fullName,
          trainerId: trainerId || userData?.uid || 'unknown',
          trainerName: trainerName,
          branchId: selectedBranchId,
          branchName: selectedBranch?.name || '',
          groupId: selectedGroupId,
          groupName: selectedGroup?.name || '',
          date: Timestamp.fromDate(new Date(attendanceDate)),
          status: item.status,
          notes: item.notes,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        })
      );

      await Promise.all(promises);

      alert('Yoklama başarıyla kaydedildi!');
      router.push('/dashboard/attendance');
    } catch (error) {
      console.error('Yoklama kaydedilirken hata:', error);
      alert('Yoklama kaydedilirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!canTakeAttendance(userData)) {
    return null;
  }

  const selectedBranch = branches.find(b => b.id === selectedBranchId);
  const selectedGroup = groups.find(g => g.id === selectedGroupId);

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
            {training ? `${training.name} - Yoklama Al` : 'Yoklama Al'}
          </h1>
          <p className="text-muted-foreground">
            {format(new Date(attendanceDate), 'dd MMMM yyyy, EEEE', { locale: tr })}
            {training && (
              <span className="ml-2">
                • {training.startTime} - {training.endTime}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ders Bilgileri</CardTitle>
          <CardDescription>
            {training 
              ? 'Antrenman bilgileri otomatik olarak yüklendi'
              : 'Yoklama alınacak dersin bilgilerini seçin'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Şube Seçimi */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Şube</label>
              <Select
                value={selectedBranchId}
                onValueChange={(value) => {
                  setSelectedBranchId(value);
                  setSelectedGroupId('');
                  setAttendanceList([]);
                  loadGroups(value);
                }}
                disabled={isTrainer(userData) && branches.length <= 1 || !!training}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Şube seçin" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grup Seçimi */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Grup</label>
              <Select
                value={selectedGroupId}
                onValueChange={setSelectedGroupId}
                disabled={!selectedBranchId || !!training}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Grup seçin" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tarih */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tarih</label>
              <Input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                disabled={!!training}
              />
            </div>

            {/* Antrenör */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Antrenör</label>
              <Input value={trainerName} disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Antrenman Bilgileri (eğer training varsa) */}
      {training && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Antrenman Detayları</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <label className="font-medium text-gray-600">Antrenman Adı:</label>
                <p className="mt-1">{training.name}</p>
              </div>
              {training.description && (
                <div>
                  <label className="font-medium text-gray-600">Açıklama:</label>
                  <p className="mt-1">{training.description}</p>
                </div>
              )}
              {training.location && (
                <div>
                  <label className="font-medium text-gray-600">Lokasyon:</label>
                  <p className="mt-1">{training.location}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Öğrenci Listesi */}
      {attendanceList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Öğrenciler ({attendanceList.length})</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAttendanceList(attendanceList.map(item => ({
                      ...item,
                      status: 'present'
                    })));
                  }}
                >
                  Tümü Geldi
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAttendanceList(attendanceList.map(item => ({
                      ...item,
                      status: 'absent'
                    })));
                  }}
                >
                  Tümü Gelmedi
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {attendanceList.map((item, index) => (
                <div key={item.student.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{item.student.fullName}</h4>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={item.status === 'present' ? 'default' : 'outline'}
                        className={item.status === 'present' ? 'bg-green-600 hover:bg-green-700' : ''}
                        onClick={() => handleStatusChange(index, 'present')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Geldi
                      </Button>
                      <Button
                        size="sm"
                        variant={item.status === 'absent' ? 'default' : 'outline'}
                        className={item.status === 'absent' ? 'bg-red-600 hover:bg-red-700' : ''}
                        onClick={() => handleStatusChange(index, 'absent')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Gelmedi
                      </Button>
                      <Button
                        size="sm"
                        variant={item.status === 'late' ? 'default' : 'outline'}
                        className={item.status === 'late' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                        onClick={() => handleStatusChange(index, 'late')}
                      >
                        <Clock className="h-4 w-4 mr-1" />
                        Geç
                      </Button>
                      <Button
                        size="sm"
                        variant={item.status === 'excused' ? 'default' : 'outline'}
                        className={item.status === 'excused' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                        onClick={() => handleStatusChange(index, 'excused')}
                      >
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Mazeret
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    placeholder="Not ekleyin..."
                    value={item.notes}
                    onChange={(e) => handleNotesChange(index, e.target.value)}
                    className="h-20"
                  />
                </div>
              ))}
            </div>

            {/* Özet */}
            <div className="mt-6 pt-6 border-t">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {attendanceList.filter(item => item.status === 'present').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Geldi</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {attendanceList.filter(item => item.status === 'absent').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Gelmedi</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {attendanceList.filter(item => item.status === 'late').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Geç Geldi</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {attendanceList.filter(item => item.status === 'excused').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Mazeretli</div>
                </div>
              </div>
            </div>

            {/* Kaydet Butonu */}
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/attendance')}
              >
                İptal
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Kaydediliyor...' : 'Yoklamayı Kaydet'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Boş Durum */}
      {selectedGroupId && attendanceList.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Bu grupta kayıtlı öğrenci bulunmuyor.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function TakeAttendancePage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <TakeAttendanceContent />
    </Suspense>
  );
}