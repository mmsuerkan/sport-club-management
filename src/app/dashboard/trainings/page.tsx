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
  Filter,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  Eye,
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
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  getDocs
} from 'firebase/firestore';

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
  createdAt: Timestamp;
  updatedAt: Timestamp;
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
    recurringDays: [] as string[]
  });

  useEffect(() => {
    const unsubscribeTrainings = onSnapshot(
      query(collection(db, 'trainings'), orderBy('date', 'desc')),
      (snapshot) => {
        const trainingsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Training));
        setTrainings(trainingsData);
        setLoading(false);
      }
    );

    const unsubscribeBranches = onSnapshot(
      collection(db, 'branches'),
      (snapshot) => {
        const branchesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Branch));
        setBranches(branchesData);
      }
    );

    const unsubscribeGroups = onSnapshot(
      collection(db, 'groups'),
      (snapshot) => {
        const groupsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Group));
        setGroups(groupsData);
      }
    );

    const unsubscribeTrainers = onSnapshot(
      collection(db, 'trainers'),
      (snapshot) => {
        const trainersData = snapshot.docs.map(doc => ({
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const selectedGroup = groups.find(g => g.id === formData.groupId);
      const selectedBranch = branches.find(b => b.id === formData.branchId);
      const selectedTrainer = trainers.find(t => t.id === formData.trainerId);

      const trainingData = {
        ...formData,
        groupName: selectedGroup?.name || '',
        branchName: selectedBranch?.name || '',
        trainerName: selectedTrainer?.fullName || '',
        maxParticipants: parseInt(formData.maxParticipants),
        currentParticipants: 0,
        status: 'scheduled' as const,
        updatedAt: Timestamp.now()
      };

      if (editingTraining) {
        await updateDoc(doc(db, 'trainings', editingTraining.id), trainingData);
      } else {
        await addDoc(collection(db, 'trainings'), {
          ...trainingData,
          createdAt: Timestamp.now()
        });
      }

      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving training:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bu antrenmanı silmek istediğinizden emin misiniz?')) {
      try {
        await deleteDoc(doc(db, 'trainings', id));
      } catch (error) {
        console.error('Error deleting training:', error);
      }
    }
  };

  const handleEdit = (training: Training) => {
    setEditingTraining(training);
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
      recurringDays: training.recurringDays || []
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
      recurringDays: []
    });
    setEditingTraining(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
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

  const filteredTrainings = trainings.filter(training => {
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
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Antrenmanlar</h1>
        <p className="text-gray-600">Tüm antrenmanları görüntüleyin ve yönetin</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <CalendarDays className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">Bu Ay</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {trainings.filter(t => new Date(t.date).getMonth() === new Date().getMonth()).length}
          </h3>
          <p className="text-gray-600 text-sm mt-1">Toplam Antrenman</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Timer className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Bugün</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {trainings.filter(t => t.date === new Date().toISOString().split('T')[0] && t.status === 'ongoing').length}
          </h3>
          <p className="text-gray-600 text-sm mt-1">Devam Eden</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <UserCheck className="h-6 w-6 text-purple-600" />
            </div>
            <span className="text-sm text-gray-500">Aktif</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {trainings.filter(t => t.status === 'scheduled').length}
          </h3>
          <p className="text-gray-600 text-sm mt-1">Planlanmış</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
            <span className="text-sm text-gray-500">Kapasite</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {trainings.reduce((acc, t) => acc + t.currentParticipants, 0)}
          </h3>
          <p className="text-gray-600 text-sm mt-1">Toplam Katılımcı</p>
        </div>
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
                    <th className="text-left p-4 font-medium text-gray-700">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrainings.map((training) => (
                    <tr key={training.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-gray-900">{training.name}</p>
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
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetails(training)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(training)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(training.id)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
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

      {showModal && createPortal(
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingTraining ? 'Antrenmanı Düzenle' : 'Yeni Antrenman Ekle'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tekrarlanan Günler (İsteğe bağlı)
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'].map((day) => (
                      <label key={day} className="flex items-center">
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
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingTraining ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {showDetailsModal && selectedTraining && createPortal(
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Antrenman Detayları</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
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

              {selectedTraining.recurringDays && selectedTraining.recurringDays.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Tekrarlanan Günler</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTraining.recurringDays.map((day) => (
                      <span key={day} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                        {day}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Kapat
                </button>
                <button
                  onClick={() => {
                    handleEdit(selectedTraining);
                    setShowDetailsModal(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Düzenle
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}