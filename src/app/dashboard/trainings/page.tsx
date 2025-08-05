'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  User,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Dumbbell,
  CalendarDays,
  Timer,
  UserCheck,
  X
} from 'lucide-react';
import { db } from '@/lib/firebase/config';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { createListener } from '@/lib/firebase/listener-utils';
import PageTitle from '@/components/page-title';
import StatCard from '@/components/stat-card';
import Loading from '@/components/loading';
import ModalTitle from '@/components/modal-title';
import EditModal from '@/components/edit-modal';
import IconButtons from '@/components/icon-buttons';
import FitnessCenterOutlinedIcon from '@mui/icons-material/FitnessCenterOutlined';

interface Training {
  id: string;
  name: string;
  description: string;
  trainerId: string;
  trainerName?: string;
  groupId: string;
  groupName?: string;
  branchId: string;
  branchName?: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  maxParticipants: number;
  currentParticipants: number;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  recurringDays?: string[];
  isRecurring?: boolean;
  recurringEndDate?: string;
  recurringCount?: number;
  recurringType?: 'weeks' | 'months';
  excludedDates?: string[];
  parentId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface RecurringTrainingInstance extends Training {
  parentId: string;
  instanceDate: string;
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

interface Trainer {
  id: string;
  fullName: string;
  groupId: string;
  branchId: string;
}

export default function TrainingsPage() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [expandedTrainings, setExpandedTrainings] = useState<(Training | RecurringTrainingInstance)[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [editingTraining, setEditingTraining] = useState<Training | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trainerId: '',
    groupId: '',
    branchId: '',
    location: '',
    date: '',
    startTime: '',
    endTime: '',
    maxParticipants: '',
    recurringDays: [] as string[],
    isRecurring: false,
    recurringEndDate: '',
    recurringCount: '',
    recurringType: 'weeks' as 'weeks' | 'months'
  });

  // Tekrarlanan antrenmanları generate eden fonksiyon
  const generateRecurringTrainings = (baseTraining: Training, maxEndDate: Date): RecurringTrainingInstance[] => {
    if (!baseTraining.isRecurring || !baseTraining.recurringDays || baseTraining.recurringDays.length === 0) {
      return [];
    }

    const instances: RecurringTrainingInstance[] = [];
    const startDate = new Date(baseTraining.date);

    // End date'i hesapla
    let endDate = maxEndDate;

    // Eğer recurringEndDate varsa onu kullan
    if (baseTraining.recurringEndDate) {
      endDate = new Date(baseTraining.recurringEndDate);
    }
    // Eğer recurringCount varsa o kadar period hesapla
    else if (baseTraining.recurringCount && baseTraining.recurringCount > 0) {
      endDate = new Date(startDate);
      const multiplier = baseTraining.recurringType === 'months' ?
        baseTraining.recurringCount * 4 : // 4 hafta = 1 ay yaklaşık
        baseTraining.recurringCount;

      endDate.setDate(endDate.getDate() + (multiplier * 7)); // Hafta cinsinden hesapla
    }


    // Tekrarlanan günlerin numara karşılıkları
    const recurringDayNumbers = baseTraining.recurringDays.map(day => {
      switch (day) {
        case 'Pazartesi': return 1;
        case 'Salı': return 2;
        case 'Çarşamba': return 3;
        case 'Perşembe': return 4;
        case 'Cuma': return 5;
        case 'Cumartesi': return 6;
        case 'Pazar': return 0;
        default: return -1;
      }
    }).filter(n => n !== -1);

    const iterDate = new Date(startDate);
    iterDate.setDate(iterDate.getDate() + 1); // Bir sonraki günden başla

    while (iterDate <= endDate) {
      const dayOfWeek = iterDate.getDay();

      if (recurringDayNumbers.includes(dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6)) {
        const instanceDate = iterDate.toISOString().split('T')[0];

        // Eğer bu tarih excludedDates listesinde varsa, instance oluşturma
        if (!baseTraining.excludedDates?.includes(instanceDate)) {
          instances.push({
            ...baseTraining,
            id: `${baseTraining.id}_${instanceDate}`,
            parentId: baseTraining.id,
            instanceDate,
            date: instanceDate,
            currentParticipants: 0
          });
        }
      }

      iterDate.setDate(iterDate.getDate() + 1);
    }

    return instances;
  };

  useEffect(() => {
    const unsubscribeTrainings = createListener(
      query(collection(db, 'trainings'), orderBy('date', 'desc')),
      (snapshot: any) => {
        const trainingsData = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data()
        } as Training));
        setTrainings(trainingsData);

        // Tekrarlanan antrenmanları generate et
        const expanded: (Training | RecurringTrainingInstance)[] = [];
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 6); // 6 ay ileri

        trainingsData.forEach((training: Training) => {
          expanded.push(training);

          if (training.isRecurring) {
            const instances = generateRecurringTrainings(training, endDate);
            expanded.push(...instances);
          }
        });

        setExpandedTrainings(expanded);
        setLoading(false);
      }
    );

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
      (snapshot: any) => {
        const groupsData = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data()
        } as Group));
        setGroups(groupsData);
      }
    );

    const unsubscribeTrainers = createListener(
      collection(db, 'trainers'),
      (snapshot: any) => {
        const trainersData = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data()
        } as Trainer));
        setTrainers(trainersData);
      }
    );

    return () => {
      unsubscribeTrainings();
      unsubscribeBranches();
      unsubscribeGroups();
      unsubscribeTrainers();
    };
  }, []);

  const addActivityLog = async (type: string, description: string, user?: string) => {
    try {
      await addDoc(collection(db, 'activity_logs'), {
        type,
        description,
        user,
        timestamp: Timestamp.now()
      });
    } catch (error) {
      console.error('Aktivite log eklenirken hata:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const selectedGroup = groups.find(g => g.id === formData.groupId);
      const selectedBranch = branches.find(b => b.id === formData.branchId);
      const selectedTrainer = trainers.find(t => t.id === formData.trainerId);

      const trainingData: any = {
        ...formData,
        groupName: selectedGroup?.name || '',
        branchName: selectedBranch?.name || '',
        trainerName: selectedTrainer?.fullName || '',
        maxParticipants: parseInt(formData.maxParticipants),
        currentParticipants: 0,
        status: 'scheduled' as const,
        isRecurring: formData.isRecurring && formData.recurringDays.length > 0,
        recurringDays: formData.isRecurring ? formData.recurringDays : [],
        recurringEndDate: formData.isRecurring ? formData.recurringEndDate : '',
        updatedAt: Timestamp.now()
      };

      // Sadece değer varsa ekle (undefined'ları Firebase'e gönderme)
      if (formData.isRecurring && formData.recurringCount && formData.recurringCount.trim()) {
        trainingData.recurringCount = parseInt(formData.recurringCount);
      }

      if (formData.isRecurring && formData.recurringType) {
        trainingData.recurringType = formData.recurringType;
      }

      // Firebase'e göndermeden önce undefined alanları temizle
      Object.keys(trainingData).forEach(key => {
        if (trainingData[key] === undefined) {
          delete trainingData[key];
        }
      });

      if (editingTraining && editingTraining.id) {
        // Mevcut antrenmanı güncelle
        await updateDoc(doc(db, 'trainings', editingTraining.id), trainingData);

        // Aktivite log'u ekle
        await addActivityLog(
          'training',
          'Antrenman planı güncellendi',
          `${formData.name} - ${selectedGroup?.name || ''}`
        );
      } else {
        // Yeni antrenman ekle (recurring instance düzenlemeden de buraya gelir)
        await addDoc(collection(db, 'trainings'), {
          ...trainingData,
          createdAt: Timestamp.now()
        });

        // Aktivite log'u ekle
        await addActivityLog(
          'training',
          'Yeni antrenman planlandı',
          `${formData.name} - ${selectedGroup?.name || ''}`
        );

        // Eğer bu bir recurring instance'dan türetilmişse, o instance'ı exclude et
        if (editingTraining && editingTraining.parentId) {
          const parentTraining = trainings.find(t => t.id === editingTraining.parentId);
          if (parentTraining) {
            const excludedDates = parentTraining.excludedDates || [];
            excludedDates.push(formData.date);

            await updateDoc(doc(db, 'trainings', editingTraining.parentId), {
              excludedDates,
              updatedAt: Timestamp.now()
            });
          }
        }
      }

      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving training:', error);
    }
  };

  const handleDelete = async (trainingToDelete: Training | RecurringTrainingInstance) => {
    // Eğer bu bir recurring instance ise (parentId var), sadece o instance'ı işaretleyelim
    if ('parentId' in trainingToDelete) {
      const confirmMessage = `${new Date(trainingToDelete.date).toLocaleDateString('tr-TR')} tarihli bu antrenmanı silmek istediğinizden emin misiniz?\n\nNot: Bu sadece seçili tarih için antrenmanı siler, diğer tekrarlanan antrenmanlar etkilenmez.`;

      if (window.confirm(confirmMessage)) {
        // Instance silme: Bu durumda sadece o tarihi hariç tutmak için parent'a silinen tarihler listesi ekleyeceğiz
        try {
          const parentId = trainingToDelete.parentId;
          const parentTraining = trainings.find(t => t.id === parentId);

          if (parentTraining && parentId) {
            const excludedDates = [...(parentTraining.excludedDates || [])];
            const dateToExclude = trainingToDelete.date;
            excludedDates.push(dateToExclude);

            await updateDoc(doc(db, 'trainings', parentId), {
              excludedDates,
              updatedAt: Timestamp.now()
            });
          }
        } catch (error) {
          console.error('Error excluding training instance:', error);
          alert('Antrenman silinirken hata oluştu: ' + (error as Error).message);
        }
      }
    } else {
      // Ana antrenman silme
      const isRecurring = trainingToDelete.isRecurring;

      if (isRecurring) {
        // Tekrarlanan antrenmanlar için özel uyarı
        const recurringCount = expandedTrainings.filter(t =>
          'parentId' in t && t.parentId === trainingToDelete.id
        ).length;

        const confirmMessage = `⚠️ ANA ANTRENMAN SİLME UYARISI ⚠️\n\n` +
          `"${trainingToDelete.name}" ana antrenmanını silmek istediğinizden emin misiniz?\n\n` +
          `Bu işlem aynı zamanda ${recurringCount} adet tekrarlanan antrenmanı da silecektir.\n\n` +
          `Eğer sadece belirli bir tarihi silmek istiyorsanız "İPTAL" tuşuna basın ve ` +
          `"Oluşturulan" etiketli antrenmanı silin.\n\n` +
          `Devam etmek istiyor musunuz?`;

        if (!window.confirm(confirmMessage)) return;
      } else {
        // Normal antrenman silme
        const confirmMessage = `"${trainingToDelete.name}" antrenmanını silmek istediğinizden emin misiniz?`;
        if (!window.confirm(confirmMessage)) return;
      }

      try {
        await deleteDoc(doc(db, 'trainings', trainingToDelete.id));
      } catch (error) {
        console.error('Error deleting training:', error);
        alert('Antrenman silinirken hata oluştu: ' + (error as Error).message);
      }
    }
  };

  const handleEdit = (training: Training | RecurringTrainingInstance) => {
    // Eğer bu bir recurring instance ise, kullanıcıyı uyar
    if ('parentId' in training) {
      const shouldContinue = window.confirm(
        'Bu otomatik oluşturulan bir antrenman. Değişiklik yapmak istediğinizden emin misiniz?\n\n' +
        'Evet: Sadece bu tarih için özel antrenman oluştur\n' +
        'Hayır: Ana antrenmanı düzenlemek için iptal et'
      );

      if (!shouldContinue) return;

      // Instance düzenleme: Parent ID'yi temizle ve özel bir antrenman olarak kaydet
      setEditingTraining({
        ...training,
        id: '', // Yeni ID oluşturacak
        parentId: undefined,
        isRecurring: false,
        recurringDays: [],
        recurringEndDate: ''
      } as Training);
    } else {
      setEditingTraining(training);
    }

    setFormData({
      name: training.name,
      description: training.description,
      trainerId: training.trainerId,
      groupId: training.groupId,
      branchId: training.branchId,
      location: training.location,
      date: training.date,
      startTime: training.startTime,
      endTime: training.endTime,
      maxParticipants: training.maxParticipants.toString(),
      recurringDays: 'parentId' in training ? [] : (training.recurringDays || []),
      isRecurring: 'parentId' in training ? false : (training.isRecurring || false),
      recurringEndDate: 'parentId' in training ? '' : (training.recurringEndDate || ''),
      recurringCount: 'parentId' in training ? '' : (training.recurringCount?.toString() || ''),
      recurringType: 'parentId' in training ? 'weeks' : (training.recurringType || 'weeks')
    });
    setShowModal(true);
  };

  const handleViewDetails = (training: Training) => {
    setSelectedTraining(training);
    setShowDetailsModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      trainerId: '',
      groupId: '',
      branchId: '',
      location: '',
      date: '',
      startTime: '',
      endTime: '',
      maxParticipants: '',
      recurringDays: [],
      isRecurring: false,
      recurringEndDate: '',
      recurringCount: '',
      recurringType: 'weeks'
    });
    setEditingTraining(null); setShowModal(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-purple-100 text-purple-800';
      case 'ongoing': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Planlandı';
      case 'ongoing': return 'Devam Ediyor';
      case 'completed': return 'Tamamlandı';
      case 'cancelled': return 'İptal Edildi';
      default: return status;
    }
  };

  const filteredTrainings = expandedTrainings.filter(training => {
    const matchesSearch = training.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      training.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      training.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = !filterBranch || training.branchId === filterBranch;
    const matchesGroup = !filterGroup || training.groupId === filterGroup;
    const matchesStatus = !filterStatus || training.status === filterStatus;

    return matchesSearch && matchesBranch && matchesGroup && matchesStatus;
  });

  const filteredGroups = groups.filter(group =>
    !formData.branchId || group.branchId === formData.branchId
  );

  const filteredTrainers = trainers.filter(trainer =>
    !formData.groupId || trainer.groupId === formData.groupId
  );

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getTrainingsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return filteredTrainings.filter(training => training.date === dateStr);
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  const dayNames = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  if (loading) {
    return (
      <Loading message="Eğitimler yükleniyor..." />
    );
  }

  return (
    <div>
      <PageTitle
        setEditingUser={undefined}
        setShowModal={setShowModal}
        pageTitle="Antrenmanlar"
        pageDescription="Tüm antrenmanları görüntüleyebilir ve yönetebilirsiniz."
        pageIcon={<FitnessCenterOutlinedIcon />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<CalendarDays />}
          label="Bu Ay"
          labelTextColor="text-blue-600"
          value={expandedTrainings.filter(t => new Date(t.date).getMonth() === new Date().getMonth()).length}
          subLabel="Toplam Antrenman"
          subLabelTextColor="text-blue-700"
          gradientFrom="from-blue-50"
          gradientTo="to-blue-100"
          borderColor="border-blue-200"
          iconBgColor="bg-blue-500"
          textColor="text-blue-900"
        />
        <StatCard
          icon={<Timer />}
          label="Bugün"
          labelTextColor="text-green-600"
          value={expandedTrainings.filter(t => t.date === new Date().toISOString().split('T')[0] && t.status === 'ongoing').length}
          subLabel="Devam Ediyor"
          subLabelTextColor="text-green-700"
          gradientFrom="from-green-50"
          gradientTo="to-green-100"
          borderColor="border-green-200"
          iconBgColor="bg-green-500"
          textColor="text-green-900"
        />
        <StatCard
          icon={<UserCheck />}
          label="Aktif"
          labelTextColor="text-purple-600"
          value={expandedTrainings.filter(t => t.status === 'scheduled').length}
          subLabel="Planlandı"
          subLabelTextColor="text-purple-700"
          gradientFrom="from-purple-50"
          gradientTo="to-purple-100"
          borderColor="border-purple-200"
          iconBgColor="bg-purple-500"
          textColor="text-purple-900"
        />

        <StatCard
          icon={<Users />}
          label="Kapasite"
          labelTextColor="text-orange-600"
          value={expandedTrainings.reduce((acc, t) => acc + t.currentParticipants, 0)}
          subLabel="Toplam Kapasite"
          subLabelTextColor="text-orange-700"
          gradientFrom="from-orange-50"
          gradientTo="to-orange-100"
          borderColor="border-orange-200"
          iconBgColor="bg-orange-500"
          textColor="text-orange-900"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col lg:flex-row gap-4 justify-between">
            <div className="flex flex-wrap gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Antrenman ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>

              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tüm Şubeler</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>

              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tüm Gruplar</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tüm Durumlar</option>
                <option value="scheduled">Planlandı</option>
                <option value="ongoing">Devam Ediyor</option>
                <option value="completed">Tamamlandı</option>
                <option value="cancelled">İptal Edildi</option>
              </select>
            </div>

            <div className="flex gap-2">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
                >
                  Liste
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 py-1 rounded ${viewMode === 'calendar' ? 'bg-white shadow' : ''}`}
                >
                  Takvim
                </button>
              </div>

              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Yeni Antrenman
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            {filteredTrainings.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left p-4 font-medium text-gray-700">Antrenman</th>
                    <th className="text-left p-4 font-medium text-gray-700">Tarih/Saat</th>
                    <th className="text-left p-4 font-medium text-gray-700">Eğitmen</th>
                    <th className="text-left p-4 font-medium text-gray-700">Grup</th>
                    <th className="text-left p-4 font-medium text-gray-700">Konum</th>
                    <th className="text-left p-4 font-medium text-gray-700">Katılım</th>
                    <th className="text-left p-4 font-medium text-gray-700">Durum</th>
                    <th className="text-center p-4 font-medium text-gray-700">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrainings.map((training) => (
                    <tr key={training.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="p-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{training.name}</p>
                            {training.isRecurring && !('parentId' in training) && (
                              <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full font-medium">
                                📅 Ana Tekrarlı
                              </span>
                            )}
                            {'parentId' in training && (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full font-medium">
                                🔄 Otomatik Oluşturulan
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 truncate max-w-xs">{training.description}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">{new Date(training.date).toLocaleDateString('tr-TR')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 mt-1">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">{training.startTime} - {training.endTime}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-600" />
                          </div>
                          <span className="text-gray-700">{training.trainerName}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="text-gray-700">{training.groupName}</p>
                          <p className="text-sm text-gray-500">{training.branchName}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="h-4 w-4" />
                          <span>{training.location}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${(training.currentParticipants / training.maxParticipants) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {training.currentParticipants}/{training.maxParticipants}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(training.status)}`}>
                          {getStatusText(training.status)}
                        </span>
                      </td>
                      <td className="p-4">
                        <IconButtons
                        item={training}
                        onEdit={() => handleEdit(training)}
                        onDelete={() => handleDelete(training)}
                        onViewDetails={() => handleViewDetails(training)}
                      />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <Dumbbell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Henüz antrenman bulunmuyor</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Bugün
                </button>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
              {dayNames.map((day, index) => (
                <div key={index} className="bg-gray-50 p-3 text-center text-sm font-medium text-gray-700">
                  {day}
                </div>
              ))}

              {getDaysInMonth(currentDate).map((day, index) => {
                const trainingsForDay = day ? getTrainingsForDate(day) : [];
                const isToday = day && day.toDateString() === new Date().toDateString();

                return (
                  <div
                    key={index}
                    className={`bg-white p-2 min-h-[100px] ${day ? 'hover:bg-gray-50' : ''} ${isToday ? 'bg-blue-50' : ''}`}
                  >
                    {day && (
                      <>
                        <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                          {day.getDate()}
                        </div>
                        <div className="space-y-1">
                          {trainingsForDay.slice(0, 2).map((training) => (
                            <div
                              key={training.id}
                              onClick={() => handleViewDetails(training)}
                              className="text-xs p-1 bg-blue-100 text-blue-700 rounded cursor-pointer hover:bg-blue-200 truncate"
                            >
                              {training.startTime} - {training.name}
                            </div>
                          ))}
                          {trainingsForDay.length > 2 && (
                            <div className="text-xs text-gray-500 text-center">
                              +{trainingsForDay.length - 2} daha
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {typeof document !== 'undefined' && createPortal(
        <EditModal className='max-w-3xl' open={showModal} onClose={() => resetForm()} onSubmit={() => handleSubmit} editing={!!editingTraining}>
          <ModalTitle
            modalTitle={editingTraining ? 'Antrenmanı Güncelle' : 'Yeni Antrenman Ekle'}
          />

          <div className="space-y-6 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Antrenman Adı
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Örn: Sabah Yoga Dersi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Şube
                </label>
                <select
                  required
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value, groupId: '', trainerId: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Şube Seçin</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grup
                </label>
                <select
                  required
                  value={formData.groupId}
                  onChange={(e) => setFormData({ ...formData, groupId: e.target.value, trainerId: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!formData.branchId}
                >
                  <option value="">Grup Seçin</option>
                  {filteredGroups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Eğitmen
                </label>
                <select
                  required
                  value={formData.trainerId}
                  onChange={(e) => setFormData({ ...formData, trainerId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!formData.groupId}
                >
                  <option value="">Eğitmen Seçin</option>
                  {filteredTrainers.map(trainer => (
                    <option key={trainer.id} value={trainer.id}>{trainer.fullName}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Antrenman detayları..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Konum
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Örn: Salon A"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maksimum Katılımcı
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.maxParticipants}
                  onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tarih
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Başlangıç Saati
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bitiş Saati
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700">
                    🔄 Bu antrenman tekrarlansın
                  </label>
                </div>

                {formData.isRecurring && (
                  <div className="space-y-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        📅 Tekrarlanan Günler
                      </label>
                      <div className="flex flex-wrap gap-3">
                        {['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'].map((day) => (
                          <label key={day} className="flex items-center bg-white px-3 py-2 rounded-lg border border-gray-200 hover:bg-blue-50 cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={formData.recurringDays.includes(day)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({ ...formData, recurringDays: [...formData.recurringDays, day] });
                                } else {
                                  setFormData({ ...formData, recurringDays: formData.recurringDays.filter(d => d !== day) });
                                }
                              }}
                              className="mr-2 text-blue-600"
                            />
                            <span className="text-sm text-gray-700 font-medium">{day}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ⏱️ Tekrarlama Süresi
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            max="52"
                            value={formData.recurringCount}
                            onChange={(e) => setFormData({ ...formData, recurringCount: e.target.value })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Sayı"
                          />
                          <select
                            value={formData.recurringType}
                            onChange={(e) => setFormData({ ...formData, recurringType: e.target.value as 'weeks' | 'months' })}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="weeks">Hafta</option>
                            <option value="months">Ay</option>
                          </select>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Örn: &quot;8 Hafta&quot; = 8 hafta boyunca tekrarla
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          📆 Veya Bitiş Tarihi
                        </label>
                        <input
                          type="date"
                          value={formData.recurringEndDate}
                          onChange={(e) => setFormData({ ...formData, recurringEndDate: e.target.value, recurringCount: e.target.value ? '' : formData.recurringCount })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min={formData.date}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Tarih seçilirse tekrarlama sayısı iptal olur
                        </p>
                      </div>
                    </div>

                    {formData.recurringDays.length > 0 && (formData.recurringCount || formData.recurringEndDate) && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-700">
                          <span className="font-medium">Özet:</span> Bu antrenman{' '}
                          <span className="font-semibold">{formData.recurringDays.join(', ')}</span> günlerinde{' '}
                          {formData.recurringEndDate
                            ? `${new Date(formData.recurringEndDate).toLocaleDateString('tr-TR')} tarihine kadar`
                            : `${formData.recurringCount} ${formData.recurringType === 'weeks' ? 'hafta' : 'ay'} boyunca`
                          } tekrarlanacak.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </EditModal>,
        document.body
      )}

      {showDetailsModal && selectedTraining && createPortal(
        <EditModal className='max-w-3xl' open={showDetailsModal} onClose={() => {resetForm(); setShowDetailsModal(false)}} onSubmit={() => handleSubmit} cancelLabel="Kapat" editLabel="Düzenle" onEdit={()=> {handleEdit(selectedTraining); setShowDetailsModal(false);}}>
          <ModalTitle
            modalTitle={'Antrenman Detayları'}
          />
          <div className="space-y-6 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Dumbbell className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{selectedTraining.name}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTraining.status)}`}>
                  {getStatusText(selectedTraining.status)}
                </span>
              </div>
            </div>

            {selectedTraining.description && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Açıklama</h4>
                <p className="text-gray-600">{selectedTraining.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Tarih ve Saat</h4>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(selectedTraining.date).toLocaleDateString('tr-TR')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>{selectedTraining.startTime} - {selectedTraining.endTime}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-2">Konum</h4>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{selectedTraining.location}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Eğitmen</h4>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                  <span className="text-gray-600">{selectedTraining.trainerName}</span>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-2">Grup</h4>
                <p className="text-gray-600">{selectedTraining.groupName}</p>
                <p className="text-sm text-gray-500">{selectedTraining.branchName}</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-700 mb-2">Katılım Durumu</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Mevcut / Maksimum</span>
                  <span className="font-medium">
                    {selectedTraining.currentParticipants} / {selectedTraining.maxParticipants}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{ width: `${(selectedTraining.currentParticipants / selectedTraining.maxParticipants) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  %{Math.round((selectedTraining.currentParticipants / selectedTraining.maxParticipants) * 100)} dolu
                </p>
              </div>
            </div>

            {selectedTraining.isRecurring && selectedTraining.recurringDays && selectedTraining.recurringDays.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-3">🔄 Tekrarlama Bilgileri</h4>
                <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <span className="text-sm text-gray-600 font-medium">📅 Tekrarlanan Günler:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedTraining.recurringDays.map((day) => (
                        <span key={day} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                          {day}
                        </span>
                      ))}
                    </div>
                  </div>

                  {selectedTraining.recurringCount && (
                    <div>
                      <span className="text-sm text-gray-600 font-medium">⏱️ Tekrarlama Süresi: </span>
                      <span className="text-sm text-gray-900 font-semibold">
                        {selectedTraining.recurringCount} {selectedTraining.recurringType === 'weeks' ? 'Hafta' : 'Ay'}
                      </span>
                    </div>
                  )}

                  {selectedTraining.recurringEndDate && (
                    <div>
                      <span className="text-sm text-gray-600 font-medium">📆 Bitiş Tarihi: </span>
                      <span className="text-sm text-gray-900 font-semibold">
                        {new Date(selectedTraining.recurringEndDate).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  )}

                  {'parentId' in selectedTraining && (
                    <div className="pt-2 border-t border-blue-200">
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                        🤖 Bu antrenman otomatik olarak oluşturulmuştur
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </EditModal>,
        document.body
      )}
    </div>
  );
}