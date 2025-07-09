'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getAllUsers, 
  createUserByAdmin, 
  updateUserData, 
  deleteUser, 
  deactivateUser,
  UserRole,
  UserData 
} from '@/lib/firebase/auth';
import { Plus, Edit, Trash2, Search, Filter, UserCheck, UserX } from 'lucide-react';

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
    name: '',
    email: '',
    password: '',
    role: UserRole.TRAINER,
    phone: '',
    isActive: true
  });

  useEffect(() => {
    loadUsers();
  }, []);

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
          name: formData.name,
          role: formData.role,
          phone: formData.phone,
          isActive: formData.isActive
        });
      } else {
        // Create new user
        await createUserByAdmin(
          formData.email,
          formData.password,
          {
            name: formData.name,
            role: formData.role,
            clubId: '',
            branchIds: [],
            isActive: formData.isActive,
            phone: formData.phone,
            createdBy: user?.uid || ''
          },
          user?.uid || ''
        );
      }
      
      setShowModal(false);
      setEditingUser(null);
      resetForm();
      loadUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Kullanıcı kaydedilemedi: ' + (error as Error).message);
    }
  };

  const handleEdit = (userData: UserWithId) => {
    setEditingUser(userData);
    setFormData({
      name: userData.name || '',
      email: userData.email || '',
      password: '',
      role: userData.role || UserRole.TRAINER,
      phone: userData.phone || '',
      isActive: userData.isActive ?? true
    });
    setShowModal(true);
  };

  const handleDelete = async (userId: string) => {
    if (confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
      try {
        await deleteUser(userId);
        loadUsers();
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
      name: '',
      email: '',
      password: '',
      role: UserRole.TRAINER,
      phone: '',
      isActive: true
    });
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kullanıcı Yönetimi</h1>
          <p className="text-gray-600">Sistem kullanıcılarını yönetin</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            resetForm();
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={20} />
          Yeni Kullanıcı
        </button>
      </div>

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-gray-900">{users.length}</div>
          <div className="text-sm text-gray-600">Toplam Kullanıcı</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-red-600">
            {users.filter(u => u.role === UserRole.ADMIN).length}
          </div>
          <div className="text-sm text-gray-600">Yönetici</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-blue-600">
            {users.filter(u => u.role === UserRole.TRAINER).length}
          </div>
          <div className="text-sm text-gray-600">Antrenör</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-green-600">
            {users.filter(u => u.isActive).length}
          </div>
          <div className="text-sm text-gray-600">Aktif</div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kullanıcı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  E-posta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Telefon
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                          {userData.createdAt ? 
                            new Date(userData.createdAt.seconds ? userData.createdAt.seconds * 1000 : userData.createdAt).toLocaleDateString('tr-TR') 
                            : 'Tarih belirtilmemiş'}
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
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      userData.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {userData.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(userData)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(userData.id, userData.isActive)}
                        className={`${userData.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                      >
                        {userData.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                      </button>
                      <button
                        onClick={() => handleDelete(userData.id)}
                        className="text-red-600 hover:text-red-900"
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
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ad Soyad
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              {!editingUser && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      E-posta
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
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
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
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
                  onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value={UserRole.ADMIN}>Yönetici</option>
                  <option value={UserRole.TRAINER}>Antrenör</option>
                  <option value={UserRole.PARENT}>Veli</option>
                  <option value={UserRole.STUDENT}>Öğrenci</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700">
                  Aktif kullanıcı
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingUser ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}