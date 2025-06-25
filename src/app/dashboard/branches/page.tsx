'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit2, Trash2, Building, MapPin, AlertCircle } from 'lucide-react';
import { collection, getDocs, doc, setDoc, deleteDoc, query, where, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/contexts/AuthContext';

interface Branch {
  id: string;
  name: string;
  address: string;
  createdAt: Date;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({ name: '', address: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    if (!user) {
      setError('Giriş yapmanız gerekiyor');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching branches, user:', user.uid);
      const querySnapshot = await getDocs(collection(db, 'branches'));
      const branchesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Branch[];
      setBranches(branchesData);
    } catch (error: any) {
      console.error('Şubeler yüklenirken hata:', error);
      setError(error.message || 'Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.address.trim()) return;

    try {
      if (editingBranch) {
        // Güncelleme
        const batch = writeBatch(db);
        
        // Şube bilgisini güncelle
        const branchRef = doc(db, 'branches', editingBranch.id);
        batch.update(branchRef, {
          name: formData.name.trim(),
          address: formData.address.trim(),
          updatedAt: new Date()
        });
        
        // İlgili öğrencilerin branchName'ini güncelle
        const studentsQuery = query(
          collection(db, 'students'),
          where('branchId', '==', editingBranch.id)
        );
        const studentsSnapshot = await getDocs(studentsQuery);
        
        studentsSnapshot.docs.forEach((studentDoc) => {
          batch.update(studentDoc.ref, {
            branchName: formData.name.trim()
          });
        });
        
        // İlgili grupların branchName'ini güncelle
        const groupsQuery = query(
          collection(db, 'groups'),
          where('branchId', '==', editingBranch.id)
        );
        const groupsSnapshot = await getDocs(groupsQuery);
        
        groupsSnapshot.docs.forEach((groupDoc) => {
          batch.update(groupDoc.ref, {
            branchName: formData.name.trim()
          });
        });
        
        await batch.commit();
      } else {
        // Yeni ekleme
        const newBranchRef = doc(collection(db, 'branches'));
        await setDoc(newBranchRef, {
          name: formData.name.trim(),
          address: formData.address.trim(),
          createdAt: new Date()
        });
      }
      
      setFormData({ name: '', address: '' });
      setShowForm(false);
      setEditingBranch(null);
      fetchBranches();
    } catch (error) {
      console.error('Şube kaydetme hatası:', error);
    }
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({ name: branch.name, address: branch.address });
    setShowForm(true);
  };

  const handleDelete = async (branchId: string) => {
    if (confirm('Bu şubeyi silmek istediğinizden emin misiniz?')) {
      try {
        await deleteDoc(doc(db, 'branches', branchId));
        fetchBranches();
      } catch (error) {
        console.error('Şube silme hatası:', error);
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingBranch(null);
    setFormData({ name: '', address: '' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Şubeler</h1>
          <p className="text-gray-400 mt-2">Klüp şubelerini yönetin</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Yeni Şube
        </button>
      </div>

      {/* Form Modal */}
      {showForm && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={handleCancel}>
          <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-lg shadow-2xl border border-gray-700 transform transition-all" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4 text-white">
              {editingBranch ? 'Şube Düzenle' : 'Yeni Şube Ekle'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Şube Adı
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                  placeholder="Örnek: Merkez Şube"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Adres
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                  placeholder="Şube adresini giriniz"
                  rows={3}
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
                >
                  {editingBranch ? 'Güncelle' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-gray-200 py-2 rounded-lg transition-colors"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Branches List */}
      <div className="bg-gray-800/50 backdrop-blur-md rounded-xl shadow-sm border border-gray-700">
        {error ? (
          <div className="p-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Hata</h3>
            <p className="text-gray-400">{error}</p>
          </div>
        ) : loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-400">Şubeler yükleniyor...</p>
          </div>
        ) : branches.length === 0 ? (
          <div className="p-8 text-center">
            <Building className="mx-auto h-12 w-12 text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-200">Şube bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-400">
              İlk şubenizi eklemek için &quot;Yeni Şube&quot; butonuna tıklayın.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Şube Adı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Adres
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Oluşturulma Tarihi
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {branches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-gray-700/30">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building className="h-5 w-5 text-gray-500 mr-3" />
                        <div className="text-sm font-medium text-gray-200">
                          {branch.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-gray-300">
                          {branch.address}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {branch.createdAt.toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(branch)}
                          className="text-blue-400 hover:text-blue-300 p-1 hover:bg-gray-700/50 rounded"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(branch.id)}
                          className="text-red-400 hover:text-red-300 p-1 hover:bg-gray-700/50 rounded"
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