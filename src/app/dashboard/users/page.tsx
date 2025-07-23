'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAllUsers,
  createUserByAdmin,
  updateUserData,
  deleteUser,
  UserRole,
  UserData
} from '@/lib/firebase/auth';
import { Trash2, Search, UserCheck, UserX, Edit2, UserCog } from 'lucide-react';
import ModalTitle from '@/components/modal-title';
import PageTitle from '@/components/page-title';
import StatCard from '@/components/stat-card';
import Modal from '@mui/material/Modal';
import BasicModal from '@/components/modal';
import { createPortal } from 'react-dom';

interface UserWithId extends UserData {
  id: string;
}

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithId | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: UserRole.TRAINER,
    isActive: true,
    studentId: '',
    trainerId: ''
  });
  const [students, setStudents] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);

  useEffect(() => {
    loadUsers();
    loadStudentsAndTrainers();
  }, []);

  const loadStudentsAndTrainers = async () => {
    try {
      // Öğrencileri yükle
      const studentsResponse = await fetch('/api/students');
      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json();
        setStudents(studentsData);
      }

      // Antrenörleri yükle
      const trainersResponse = await fetch('/api/trainers');
      if (trainersResponse.ok) {
        const trainersData = await trainersResponse.json();
        setTrainers(trainersData);
      }
    } catch (error) {
      console.error('Öğrenci/Antrenör listesi yüklenirken hata:', error);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await getAllUsers();
      setUsers(usersData as UserWithId[]);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(userData => {
    const matchesSearch = (userData.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (userData.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || userData.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Update existing user
        await updateUserData(editingUser.id, {
          role: formData.role,
          isActive: formData.isActive,
          phone: '' // Boş string olarak gönder
        });
      } else {
        // Create new user
        let userName = '';
        let selectedRecord = null;

        // İlişkilendirilecek kayıttan adı al
        if (formData.role === UserRole.TRAINER && formData.trainerId) {
          selectedRecord = trainers.find(t => t.id === formData.trainerId);
          userName = selectedRecord?.fullName || selectedRecord?.name || '';
        } else if (formData.role === UserRole.PARENT && formData.studentId) {
          selectedRecord = students.find(s => s.id === formData.studentId);
          userName = selectedRecord?.fullName || selectedRecord?.name || '';
        } else if (formData.role === UserRole.STUDENT && formData.studentId) {
          selectedRecord = students.find(s => s.id === formData.studentId);
          userName = selectedRecord?.fullName || selectedRecord?.name || '';
        } else if (formData.role === UserRole.ADMIN) {
          // Admin için email'den kullanıcı adı oluştur
          userName = formData.email.split('@')[0];
        }

        const userData = {
          name: userName,
          role: formData.role,
          clubId: '',
          branchIds: [],
          isActive: formData.isActive,
          phone: '', // Boş string olarak gönder
          createdBy: user?.uid || ''
        };

        const newUser = await createUserByAdmin(
          formData.email,
          formData.password,
          userData,
          user?.uid || ''
        );

        // Rol bazlı ilişkilendirme
        if (formData.role === UserRole.TRAINER && formData.trainerId) {
          // Antrenör kaydını kullanıcı ID'si ile güncelle
          await fetch(`/api/trainers/${formData.trainerId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: newUser.uid })
          });
        } else if (formData.role === UserRole.PARENT && formData.studentId) {
          // Öğrenci kaydını parent ID'si ile güncelle
          await fetch(`/api/students/${formData.studentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parentId: newUser.uid })
          });
        } else if (formData.role === UserRole.STUDENT && formData.studentId) {
          // Öğrenci kaydını kullanıcı ID'si ile güncelle
          await fetch(`/api/students/${formData.studentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: newUser.uid })
          });
        }
      }

      setShowModal(false);
      setEditingUser(null);
      resetForm();
      loadUsers();
      loadStudentsAndTrainers(); // Dropdown'ları güncelle
    } catch (error) {
      alert('Kullanıcı kaydedilemedi: ' + (error as Error).message);
    }
  };

  const handleEdit = (userData: UserWithId) => {
    setEditingUser(userData);
    setFormData({
      email: userData.email || '',
      password: '',
      role: userData.role || UserRole.TRAINER,
      isActive: userData.isActive ?? true,
      studentId: '',
      trainerId: ''
    });
    setShowModal(true);
  };

  const handleDelete = async (userId: string) => {
    if (confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
      try {
        await deleteUser(userId);
        loadUsers();
        loadStudentsAndTrainers(); // Dropdown'ları güncelle
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Kullanıcı silinemedi: ' + (error as Error).message);
      }
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      await updateUserData(userId, { isActive: !isActive });
      loadUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      role: UserRole.TRAINER,
      isActive: true,
      studentId: '',
      trainerId: ''
    });
    setShowModal(false);
    setEditingUser(null);
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-red-100 text-red-800';
      case UserRole.TRAINER:
        return 'bg-blue-100 text-blue-800';
      case UserRole.PARENT:
        return 'bg-green-100 text-green-800';
      case UserRole.STUDENT:
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'Yönetici';
      case UserRole.TRAINER:
        return 'Antrenör';
      case UserRole.PARENT:
        return 'Veli';
      case UserRole.STUDENT:
        return 'Öğrenci';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <PageTitle
        setEditingUser={setEditingUser}
        setShowModal={setShowModal}
        pageTitle="Kullanıcı Yönetimi"
        pageDescription="Sistem kullanıcılarını yönetebilirsiniz."
        firstButtonText="Yeni Kullanıcı Ekle"
        pageIcon={<UserCog />}
      />

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Kullanıcı ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserRole | 'ALL')}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="ALL">Tüm Roller</option>
          <option value={UserRole.ADMIN}>Yönetici</option>
          <option value={UserRole.TRAINER}>Antrenör</option>
          <option value={UserRole.PARENT}>Veli</option>
          <option value={UserRole.STUDENT}>Öğrenci</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 my-5">


        <StatCard
          value={users.length}
          subLabel="Toplam Kullanıcı"
          subLabelTextColor="text-slate-700"
          gradientFrom="from-slate-50"
          gradientTo="to-slate-100"
          borderColor="border-slate-200"
          textColor='text-slate-600'
        />
        <StatCard
          value={users.filter(u => u.role === UserRole.ADMIN).length}
          subLabel="Yönetici"
          subLabelTextColor="text-red-700"
          gradientFrom="from-red-50"
          gradientTo="to-red-100"
          borderColor="border-red-200"
          textColor='text-red-600'
        />
        <StatCard
          value={users.filter(u => u.role === UserRole.TRAINER).length}
          subLabel="Antrenör"
          subLabelTextColor="text-blue-700"
          gradientFrom="from-blue-50"
          gradientTo="to-blue-100"
          borderColor="border-blue-200"
          textColor='text-blue-600'
        />

        <StatCard
          value={users.filter(u => u.isActive).length}
          subLabel="Aktif"
          subLabelTextColor="text-green-700"
          gradientFrom="from-green-50"
          gradientTo="to-green-100"
          borderColor="border-green-200"
          textColor='text-green-600'
        />
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ">
                  Kullanıcı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ">
                  E-posta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ">
                  Telefon
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((userData) => (
                <tr key={userData.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {(userData.name || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {userData.name || 'İsimsiz Kullanıcı'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {userData.createdAt
                            ? (() => {
                              if (userData.createdAt && typeof userData.createdAt === 'object' && typeof (userData.createdAt as any).toDate === 'function') {
                                return (userData.createdAt as any).toDate().toLocaleDateString('tr-TR');
                              } else {
                                return new Date(userData.createdAt).toLocaleDateString('tr-TR');
                              }
                            })()
                            : 'Tarih belirtilmemiş'
                          }
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {userData.email || 'Email yok'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(userData.role)}`}>
                      {getRoleLabel(userData.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {userData.phone || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${userData.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {userData.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(userData)}
                        className="text-blue-400 hover:text-blue-700"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(userData.id, userData.isActive)}
                        className={`${userData.isActive ? 'p-1 text-red-400 hover:text-red-700' : 'p-1 text-green-400 hover:text-green-700'}`}
                      >
                        {userData.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                      </button>
                      <button
                        onClick={() => handleDelete(userData.id)}
                        className="p-1 text-red-400 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && typeof document !== 'undefined' && createPortal(
        <BasicModal className='max-w-lg' open={showModal} onClose={() => resetForm()}>
          <ModalTitle modalTitle={editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'} onClose={() => resetForm()} />
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingUser && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-posta
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Şifre
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                    minLength={6}
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole, studentId: '', trainerId: '' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value={UserRole.ADMIN}>Yönetici</option>
                <option value={UserRole.TRAINER}>Antrenör</option>
                <option value={UserRole.PARENT}>Veli</option>
                <option value={UserRole.STUDENT}>Öğrenci</option>
              </select>
            </div>

            {/* Antrenör seçimi - TRAINER rolü için */}
            {formData.role === UserRole.TRAINER && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Antrenör Kaydı
                </label>
                {(() => {
                  const availableTrainers = trainers.filter(t => {
                    const hasUserId = t.userId && t.userId.trim() !== '';
                    return !hasUserId;
                  });

                  if (availableTrainers.length === 0) {
                    return (
                      <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                        Tüm antrenör kayıtları zaten bir kullanıcı hesabıyla ilişkilendirilmiş.
                        Önce yeni bir antrenör kaydı oluşturmanız gerekiyor.
                      </p>
                    );
                  }

                  return (
                    <>
                      <select
                        value={formData.trainerId}
                        onChange={(e) => setFormData({ ...formData, trainerId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      >
                        <option value="">Antrenör seçin...</option>
                        {availableTrainers.map((trainer) => (
                          <option key={trainer.id} value={trainer.id}>
                            {trainer.fullName || trainer.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-sm text-gray-500 mt-1">
                        Bu kullanıcı hesabı seçilen antrenör kaydıyla ilişkilendirilecek
                      </p>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Öğrenci seçimi - PARENT rolü için */}
            {formData.role === UserRole.PARENT && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Öğrenci Kaydı (Çocuk)
                </label>
                {students.filter(s => !s.parentId).length === 0 ? (
                  <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    Tüm öğrenci kayıtları zaten bir veli hesabıyla ilişkilendirilmiş.
                    Önce yeni bir öğrenci kaydı oluşturmanız gerekiyor.
                  </p>
                ) : (
                  <>
                    <select
                      value={formData.studentId}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="">Öğrenci seçin...</option>
                      {students.filter(student => !student.parentId).map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.fullName || student.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-sm text-gray-500 mt-1">
                      Bu veli hesabı seçilen öğrenciyle ilişkilendirilecek
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Öğrenci seçimi - STUDENT rolü için */}
            {formData.role === UserRole.STUDENT && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Öğrenci Kaydı
                </label>
                {students.filter(s => !s.userId).length === 0 ? (
                  <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    Tüm öğrenci kayıtları zaten bir kullanıcı hesabıyla ilişkilendirilmiş.
                    Önce yeni bir öğrenci kaydı oluşturmanız gerekiyor.
                  </p>
                ) : (
                  <>
                    <select
                      value={formData.studentId}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="">Öğrenci seçin...</option>
                      {students.filter(student => !student.userId).map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.fullName || student.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-sm text-gray-500 mt-1">
                      Bu öğrenci hesabı seçilen kayıtla ilişkilendirilecek
                    </p>
                  </>
                )}
              </div>
            )}


            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="mr-2"
              />
              <label className="text-sm font-medium text-gray-700">
                Aktif kullanıcı
              </label>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 text-white rounded-md bg-gradient-to-r from-blue-500 to-purple-600"
              >
                {editingUser ? 'Güncelle' : 'Ekle'}
              </button>
            </div>
          </form>
        </BasicModal>,
        document.body
      )}
    </div>
  );
}