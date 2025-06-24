'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit2, Trash2, UsersIcon, Clock, Building } from 'lucide-react';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface Branch {
  id: string;
  name: string;
  address: string;
}

interface Group {
  id: string;
  name: string;
  branchId: string;
  branchName: string;
  time: string;
  createdAt: Date;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [formData, setFormData] = useState({ name: '', branchId: '', time: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroups();
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'branches'));
      const branchesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Branch[];
      setBranches(branchesData);
    } catch (error) {
      console.error('Şubeler yüklenirken hata:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'groups'));
      const groupsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Group[];
      setGroups(groupsData);
    } catch (error) {
      console.error('Gruplar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.branchId || !formData.time.trim()) return;

    try {
      const selectedBranch = branches.find(b => b.id === formData.branchId);
      
      if (editingGroup) {
        // Güncelleme
        await updateDoc(doc(db, 'groups', editingGroup.id), {
          name: formData.name.trim(),
          branchId: formData.branchId,
          branchName: selectedBranch?.name || '',
          time: formData.time.trim(),
          updatedAt: new Date()
        });
      } else {
        // Yeni ekleme
        const newGroupRef = doc(collection(db, 'groups'));
        await setDoc(newGroupRef, {
          name: formData.name.trim(),
          branchId: formData.branchId,
          branchName: selectedBranch?.name || '',
          time: formData.time.trim(),
          createdAt: new Date()
        });
      }
      
      setFormData({ name: '', branchId: '', time: '' });
      setShowForm(false);
      setEditingGroup(null);
      fetchGroups();
    } catch (error) {
      console.error('Grup kaydetme hatası:', error);
    }
  };

  const handleEdit = (group: Group) => {
    setEditingGroup(group);
    setFormData({ name: group.name, branchId: group.branchId, time: group.time });
    setShowForm(true);
  };

  const handleDelete = async (groupId: string) => {
    if (confirm('Bu grubu silmek istediğinizden emin misiniz?')) {
      try {
        await deleteDoc(doc(db, 'groups', groupId));
        fetchGroups();
      } catch (error) {
        console.error('Grup silme hatası:', error);
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingGroup(null);
    setFormData({ name: '', branchId: '', time: '' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gruplar</h1>
          <p className="text-gray-600 mt-2">Antrenman gruplarını yönetin</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Yeni Grup
        </button>
      </div>

      {/* Form Modal */}
      {showForm && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[9999]" onClick={handleCancel}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">
              {editingGroup ? 'Grup Düzenle' : 'Yeni Grup Ekle'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grup Adı
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Örnek: Yüzme Başlangıç"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Şube
                </label>
                <select
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Şube seçiniz</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Antrenman Saati
                </label>
                <input
                  type="text"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Örnek: Pazartesi 18:00-19:00"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
                >
                  {editingGroup ? 'Güncelle' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded-lg transition-colors"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Groups List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Gruplar yükleniyor...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="p-8 text-center">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Grup bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500">
              İlk grubunuzu eklemek için "Yeni Grup" butonuna tıklayın.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grup Adı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Şube
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Antrenman Saati
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Oluşturulma Tarihi
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {groups.map((group) => (
                  <tr key={group.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UsersIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div className="text-sm font-medium text-gray-900">
                          {group.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building className="h-4 w-4 text-gray-400 mr-2" />
                        <div className="text-sm text-gray-600">
                          {group.branchName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-gray-400 mr-2" />
                        <div className="text-sm text-gray-600">
                          {group.time}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {group.createdAt.toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(group)}
                          className="text-blue-600 hover:text-blue-700 p-1 hover:bg-blue-50 rounded"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(group.id)}
                          className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded"
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
        )}
      </div>
    </div>
  );
}