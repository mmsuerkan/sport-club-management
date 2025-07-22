'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ClipboardCheck,
  Users,
  Calendar,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Building,
  Dumbbell,
  Eye,
  UserCheck,
  UserX,
  Download,
  AlertCircle
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { createListener } from '@/lib/firebase/listener-utils';
import { attendanceService } from '@/lib/firebase/attendance-service';
import dynamic from 'next/dynamic';
import PageTitle from '@/components/page-title';
import Loading from '@/components/loading';

const AttendanceAnalytics = dynamic(
  () => import('@/components/attendance/AttendanceAnalytics'),
  { ssr: false }
);

interface Branch {
  id: string;
  name: string;
}

interface Group {
  id: string;
  name: string;
  branchId: string;
  branchName: string;
  time: string;
}

interface Student {
  id: string;
  fullName: string;
  phone: string;
  branchId: string;
  branchName: string;
  groupId: string;
  groupName: string;
}

interface Training {
  id: string;
  name: string;
  branchId: string;
  branchName?: string;
  groupId: string;
  groupName?: string;
  date: Date;
  trainerId: string;
  trainerName?: string;
  duration?: string;
}

interface AttendanceRecord {
  id: string;
  trainingId: string;
  trainingName: string;
  studentId: string;
  studentName: string;
  branchId: string;
  branchName: string;
  groupId: string;
  groupName: string;
  date: Date;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes: string;
  recordedBy: string;
  recordedAt: Date;
}

interface AttendanceSession {
  id: string;
  trainingId: string;
  trainingName: string;
  branchId: string;
  branchName: string;
  groupId: string;
  groupName: string;
  date: Date;
  trainerId: string;
  trainerName: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  isCompleted: boolean;
  completedAt?: Date;
  notes: string;
}

export default function AttendancePage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [currentAttendance, setCurrentAttendance] = useState<{ [studentId: string]: AttendanceRecord }>({});
  const [sessionDetails, setSessionDetails] = useState<AttendanceRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'analytics'>('list');
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedSessionForQR, setSelectedSessionForQR] = useState<AttendanceSession | null>(null);
  const [showOnlyPending, setShowOnlyPending] = useState(false);

  useEffect(() => {
    // Firebase listeners
    const unsubscribeBranches = createListener(
      collection(db, 'branches'),
      (snapshot: any) => {
        const branchesData = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data()
        } as Branch));
        setBranches(branchesData);
      }
    );

    const unsubscribeGroups = createListener(
      collection(db, 'groups'),
      (snapshot:any) => {
        const groupsData = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data()
        } as Group));
        setGroups(groupsData);
      }
    );

    const unsubscribeStudents = createListener(
      collection(db, 'students'),
      (snapshot: any) => {
        const studentsData = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data()
        } as Student));
        setStudents(studentsData);
      }
    );

    const unsubscribeTrainings = createListener(
      query(collection(db, 'trainings'), orderBy('date', 'desc')),
      (snapshot: any) => {
        const trainingsData = snapshot.docs.map((doc: any) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
            startTime: data.startTime,
            endTime: data.endTime
          } as Training;
        });
        setTrainings(trainingsData);

        // Create attendance sessions for trainings that don't have one
        trainingsData.forEach((training: any)=> {
          if (training.status === 'scheduled') {
            attendanceService.createAttendanceSessionFromTraining(training);
          }
        });
      }
    );

    const unsubscribeAttendanceSessions = createListener(
      query(collection(db, 'attendanceSessions'), orderBy('date', 'desc')),
      (snapshot: any) => {
        const sessionsData = snapshot.docs.map((doc: any) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: data.date?.toDate() || new Date(),
            completedAt: data.completedAt?.toDate()
          } as AttendanceSession;
        });
        setAttendanceSessions(sessionsData);
        setLoading(false);
      }
    );

    fetchData();

    return () => {
      unsubscribeBranches();
      unsubscribeGroups();
      unsubscribeStudents();
      unsubscribeTrainings();
      unsubscribeAttendanceSessions();
    };
  }, []);

  useEffect(() => {
    if (selectedBranch || selectedGroup || selectedDate) {
      fetchAttendanceSessions();
    }
  }, [selectedBranch, selectedGroup, selectedDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceSessions = async () => {
    try {
      const filters: any = {};
      if (selectedBranch) filters.branchId = selectedBranch;
      if (selectedGroup) filters.groupId = selectedGroup;

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      filters.startDate = startOfDay;
      filters.endDate = endOfDay;

      const sessions = await attendanceService.getAttendanceSessions(filters);
      setAttendanceSessions(sessions);
    } catch (error) {
      console.error('Error fetching attendance sessions:', error);
    }
  };

  const startAttendance = (training: Training) => {
    setSelectedTraining(training);

    // Get students for this group
    const groupStudents = students.filter(s => s.groupId === training.groupId);

    // Initialize attendance records
    const initialAttendance: { [studentId: string]: AttendanceRecord } = {};
    groupStudents.forEach(student => {
      initialAttendance[student.id] = {
        id: `${training.id}_${student.id}_${selectedDate}`,
        trainingId: training.id,
        trainingName: training.name,
        studentId: student.id,
        studentName: student.fullName,
        branchId: training.branchId,
        branchName: training.branchName,
        groupId: training.groupId,
        groupName: training.groupName,
        date: new Date(selectedDate),
        status: 'present',
        notes: '',
        recordedBy: 'Admin', // TODO: Get from auth context
        recordedAt: new Date()
      };
    });

    setCurrentAttendance(initialAttendance);
    setShowAttendanceModal(true);
  };

  const updateAttendanceStatus = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    setCurrentAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  const updateAttendanceNotes = (studentId: string, notes: string) => {
    setCurrentAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes
      }
    }));
  };

  const viewAttendanceDetails = async (session: AttendanceSession) => {
    setSelectedSession(session);

    // Filter attendance records for this session
    const sessionRecords = attendanceRecords.filter(record =>
      record.trainingId === session.trainingId &&
      record.date.toDateString() === session.date.toDateString()
    );

    setSessionDetails(sessionRecords);
    setShowDetailModal(true);
  };

  const exportSessionToCSV = (session: AttendanceSession, records: AttendanceRecord[]) => {
    try {
      // CSV içeriği oluştur
      const csvContent = [
        'Yoklama Raporu',
        '',
        `Antrenman: ${session.trainingName}`,
        `Şube: ${session.branchName}`,
        `Grup: ${session.groupName}`,
        `Tarih: ${session.date.toLocaleDateString('tr-TR')}`,
        `Antrenör: ${session.trainerName}`,
        '',
        'Özet:',
        `Toplam Öğrenci: ${session.totalStudents}`,
        `Katılan: ${session.presentCount}`,
        `Katılmayan: ${session.absentCount}`,
        `Geç Gelen: ${session.lateCount}`,
        `Mazeretli: ${session.excusedCount}`,
        `Katılım Oranı: %${((session.presentCount / session.totalStudents) * 100).toFixed(1)}`,
        '',
        'Detaylı Liste:',
        'Öğrenci Adı,Durum,Not,Kaydeden,Kayıt Zamanı',
        ...records.map(record =>
          `"${record.studentName}","${getStatusText(record.status)}","${record.notes || '-'}","${record.recordedBy}","${record.recordedAt.toLocaleString('tr-TR')}"`
        )
      ].join('\n');

      // CSV dosyasını indir
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const fileName = `yoklama_${session.groupName}_${session.date.toISOString().split('T')[0]}.csv`;
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      alert('CSV dosyası başarıyla indirildi!');
    } catch (error) {
      console.error('CSV export hatası:', error);
      alert('CSV dosyası indirilemedi.');
    }
  };

  const saveAttendance = async () => {
    if (!selectedTraining) return;

    try {
      setSaving(true);

      const attendanceList = Object.values(currentAttendance);
      const presentCount = attendanceList.filter(a => a.status === 'present').length;
      const absentCount = attendanceList.filter(a => a.status === 'absent').length;
      const lateCount = attendanceList.filter(a => a.status === 'late').length;
      const excusedCount = attendanceList.filter(a => a.status === 'excused').length;

      // Mock save - simulate saving attendance
      console.log('Yoklama kaydediliyor (mock):', {
        training: selectedTraining.name,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        excused: excusedCount
      });

      // Add to mock sessions
      const newSession: AttendanceSession = {
        id: `session_${selectedTraining.id}_${selectedDate}`,
        trainingId: selectedTraining.id,
        trainingName: selectedTraining.name,
        branchId: selectedTraining.branchId,
        branchName: selectedTraining.branchName || '',
        groupId: selectedTraining.groupId,
        groupName: selectedTraining.groupName || '',
        date: new Date(selectedDate),
        trainerId: selectedTraining.trainerId,
        trainerName: selectedTraining.trainerName || '',
        totalStudents: attendanceList.length,
        presentCount,
        absentCount,
        lateCount,
        excusedCount,
        isCompleted: true,
        completedAt: new Date(),
        notes: ''
      };

      setAttendanceSessions(prev => [...prev, newSession]);

      // Also save the individual records for detail view
      setAttendanceRecords(prev => [...prev, ...attendanceList]);

      setShowAttendanceModal(false);

      alert('Yoklama başarıyla kaydedildi (demo)!');

    } catch (error) {
      console.error('Yoklama kaydetme hatası:', error);
    } finally {
      setSaving(false);
    }
  };

  const filteredTrainings = trainings.filter(training => {
    const matchesBranch = !selectedBranch || training.branchId === selectedBranch;
    const matchesGroup = !selectedGroup || training.groupId === selectedGroup;
    const matchesDate = training.date.toDateString() === new Date(selectedDate).toDateString();
    const matchesSearch = !searchTerm ||
      training.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      training.trainerName.toLowerCase().includes(searchTerm.toLowerCase());

    // Check if only pending attendances should be shown
    let matchesPending = true;
    if (showOnlyPending) {
      const session = attendanceSessions.find(s =>
        s.trainingId === training.id &&
        s.date.toDateString() === new Date(selectedDate).toDateString()
      );
      matchesPending = !session || !session.isCompleted;
    }

    return matchesBranch && matchesGroup && matchesDate && matchesSearch && matchesPending;
  });

  const filteredGroups = groups.filter(group =>
    !selectedBranch || group.branchId === selectedBranch
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'text-green-600 bg-green-50';
      case 'absent': return 'text-red-600 bg-red-50';
      case 'late': return 'text-yellow-600 bg-yellow-50';
      case 'excused': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <UserCheck className="h-4 w-4" />;
      case 'absent': return <UserX className="h-4 w-4" />;
      case 'late': return <Clock className="h-4 w-4" />;
      case 'excused': return <CheckCircle className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'present': return 'Katıldı';
      case 'absent': return 'Katılmadı';
      case 'late': return 'Geç Geldi';
      case 'excused': return 'Mazeret';
      default: return 'Bilinmiyor';
    }
  };


  if (loading) {
    return (
      <Loading message='Veriler yükleniyor...' />
    );
  }

  return (
    <div>
      <PageTitle
        setEditingUser={undefined}
        pageTitle="Yoklama Takip"
        pageDescription="Antrenman katılım durumlarını takip edebilirsiniz."
        firstButtonText="Listele"
        secondButtonText="Yeni Analizler"
        pageIcon={<ClipboardCheck />}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />
      {viewMode === 'analytics' ? (
        <AttendanceAnalytics
          branchId={selectedBranch}
          groupId={selectedGroup}
        />
      ) : (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Şube
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) => {
                    setSelectedBranch(e.target.value);
                    setSelectedGroup('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tüm Şubeler</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grup
                </label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!selectedBranch}
                >
                  <option value="">Tüm Gruplar</option>
                  {filteredGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.time})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tarih
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Arama
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Antrenman veya antrenör ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filtre
                </label>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showOnlyPending"
                    checked={showOnlyPending}
                    onChange={(e) => setShowOnlyPending(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="showOnlyPending" className="ml-2 text-sm text-gray-700">
                    Sadece bekleyenleri göster
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Trainings List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {filteredTrainings.length === 0 ? (
              <div className="p-8 text-center">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Antrenman bulunamadı</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Seçilen kriterlere uygun antrenman bulunmuyor.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ">
                        Antrenman
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ">
                        Şube & Grup
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ">
                        Antrenör
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ">
                        Katılım Durumu
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase ">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTrainings.map((training) => {
                      const session = attendanceSessions.find(s =>
                        s.trainingId === training.id &&
                        s.date.toDateString() === new Date(selectedDate).toDateString()
                      );

                      return (
                        <tr key={training.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Dumbbell className="h-5 w-5 text-gray-400 mr-3" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {training.name}
                                </div>
                                {training.duration && (
                                  <div className="text-xs text-gray-500">
                                    {training.duration} dakika
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center text-sm text-gray-600">
                                <Building className="h-3 w-3 mr-2" />
                                {training.branchName || 'Şube bilgisi yok'}
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <Users className="h-3 w-3 mr-2" />
                                {training.groupName || 'Grup bilgisi yok'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {training.trainerName || 'Antrenör bilgisi yok'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {session ? (
                              session.isCompleted ? (
                                <div className="space-y-1">
                                  <div className="flex items-center text-sm">
                                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                    <span className="text-green-600 font-medium">Tamamlandı</span>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {session.presentCount}/{session.totalStudents} katıldı
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <div className="flex items-center text-sm">
                                    <Clock className="h-4 w-4 text-yellow-500 mr-2" />
                                    <span className="text-yellow-600 font-medium">Devam Ediyor</span>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Yoklama alınıyor...
                                  </div>
                                </div>
                              )
                            ) : (
                              (() => {
                                const trainingDate = new Date(training.date);
                                const now = new Date();
                                const isPast = trainingDate < now;

                                return (
                                  <div className="flex items-center text-sm">
                                    {isPast ? (
                                      <>
                                        <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                                        <span className="text-red-600 font-medium">Yoklama Alınmadı!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Clock className="h-4 w-4 text-gray-400 mr-2" />
                                        <span className="text-gray-500">Beklemede</span>
                                      </>
                                    )}
                                  </div>
                                );
                              })()
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              {session ? (
                                <button
                                  onClick={() => viewAttendanceDetails(session)}
                                  className="text-blue-600 hover:text-blue-700 p-1 hover:bg-blue-50 rounded"
                                  title="Detayları Görüntüle"
                                >
                                  <Eye size={16} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => startAttendance(training)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                                >
                                  <ClipboardCheck size={14} />
                                  Yoklama Al
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Attendance Modal */}
          {showAttendanceModal && selectedTraining && typeof document !== 'undefined' && createPortal(
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-[9999] p-4">
              <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        Yoklama Al - {selectedTraining.name}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedTraining.branchName} - {selectedTraining.groupName} | {new Date(selectedDate).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAttendanceModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XCircle size={24} />
                    </button>
                  </div>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                  <div className="space-y-4">
                    {Object.values(currentAttendance).map((record) => (
                      <div key={record.studentId} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-medium text-gray-900">{record.studentName}</h3>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateAttendanceStatus(record.studentId, 'present')}
                              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${record.status === 'present'
                                ? 'bg-green-100 text-green-700 border-2 border-green-300'
                                : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-green-50'
                                }`}
                            >
                              <UserCheck className="h-4 w-4 inline mr-1" />
                              Katıldı
                            </button>
                            <button
                              onClick={() => updateAttendanceStatus(record.studentId, 'late')}
                              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${record.status === 'late'
                                ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300'
                                : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-yellow-50'
                                }`}
                            >
                              <Clock className="h-4 w-4 inline mr-1" />
                              Geç Geldi
                            </button>
                            <button
                              onClick={() => updateAttendanceStatus(record.studentId, 'excused')}
                              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${record.status === 'excused'
                                ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                                : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-blue-50'
                                }`}
                            >
                              <CheckCircle className="h-4 w-4 inline mr-1" />
                              Mazeret
                            </button>
                            <button
                              onClick={() => updateAttendanceStatus(record.studentId, 'absent')}
                              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${record.status === 'absent'
                                ? 'bg-red-100 text-red-700 border-2 border-red-300'
                                : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-red-50'
                                }`}
                            >
                              <UserX className="h-4 w-4 inline mr-1" />
                              Katılmadı
                            </button>
                          </div>
                        </div>

                        <input
                          type="text"
                          placeholder="Not ekleyin..."
                          value={record.notes}
                          onChange={(e) => updateAttendanceNotes(record.studentId, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-gray-600">
                        Toplam {Object.keys(currentAttendance).length} öğrenci
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const updatedAttendance = { ...currentAttendance };
                            Object.keys(updatedAttendance).forEach(studentId => {
                              updatedAttendance[studentId] = {
                                ...updatedAttendance[studentId],
                                status: 'present'
                              };
                            });
                            setCurrentAttendance(updatedAttendance);
                          }}
                          className="text-xs px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors"
                        >
                          Tümü Katıldı
                        </button>
                        <button
                          onClick={() => {
                            const updatedAttendance = { ...currentAttendance };
                            Object.keys(updatedAttendance).forEach(studentId => {
                              updatedAttendance[studentId] = {
                                ...updatedAttendance[studentId],
                                status: 'absent'
                              };
                            });
                            setCurrentAttendance(updatedAttendance);
                          }}
                          className="text-xs px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
                        >
                          Tümü Katılmadı
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowAttendanceModal(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        İptal
                      </button>
                      <button
                        onClick={saveAttendance}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Kaydediliyor...
                          </>
                        ) : (
                          <>
                            <ClipboardCheck size={16} />
                            Yoklamayı Kaydet
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Attendance Details Modal */}
          {showDetailModal && selectedSession && typeof document !== 'undefined' && createPortal(
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
              <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        Yoklama Detayları - {selectedSession.trainingName}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedSession.branchName} - {selectedSession.groupName} | {selectedSession.date.toLocaleDateString('tr-TR')}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-green-600">✓ {selectedSession.presentCount} Katıldı</span>
                        <span className="text-red-600">✗ {selectedSession.absentCount} Katılmadı</span>
                        {selectedSession.lateCount > 0 && (
                          <span className="text-yellow-600">⏰ {selectedSession.lateCount} Geç Geldi</span>
                        )}
                        {selectedSession.excusedCount > 0 && (
                          <span className="text-blue-600">📋 {selectedSession.excusedCount} Mazeret</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XCircle size={24} />
                    </button>
                  </div>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                  {sessionDetails.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">Detay bulunamadı</h3>
                      <p className="mt-1 text-sm text-gray-500">Bu oturum için yoklama detayları yüklenmedi.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sessionDetails.map((record) => (
                        <div key={record.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${getStatusColor(record.status)}`}>
                                {getStatusIcon(record.status)}
                              </div>
                              <div>
                                <h3 className="font-medium text-gray-900">{record.studentName}</h3>
                                <p className="text-sm text-gray-600">
                                  Durum: <span className="font-medium">{getStatusText(record.status)}</span>
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-500">
                                Kaydeden: {record.recordedBy}
                              </p>
                              <p className="text-xs text-gray-400">
                                {record.recordedAt.toLocaleString('tr-TR')}
                              </p>
                            </div>
                          </div>

                          {record.notes && (
                            <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                              <p className="text-sm text-gray-700">
                                <strong>Not:</strong> {record.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Toplam {selectedSession.totalStudents} öğrenci
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => exportSessionToCSV(selectedSession, sessionDetails)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Download size={16} />
                        CSV İndir
                      </button>
                      <button
                        onClick={() => setShowDetailModal(false)}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                      >
                        Kapat
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
}