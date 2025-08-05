'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Edit2, Trash2, Building, MapPin } from 'lucide-react';
import { collection, getDocs, doc, setDoc, deleteDoc, query, where, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import ModalTitle from '@/components/modal-title';
import PageTitle from '@/components/page-title';
import Loading from '@/components/loading';
import EditModal from '@/components/edit-modal';
import IconButtons from '@/components/icon-buttons';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';

interface Branch {
  id: string;
  name: string;
  address: string;
  createdAt: Date;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({ name: '', address: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'branches'));
      const branchesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Branch[];
      setBranches(branchesData);
    } catch (error) {
      console.error('Şubeler yüklenirken hata:', error);
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
      setShowModal(false);
      setEditingBranch(null);
      fetchBranches();
    } catch (error) {
      console.error('Şube kaydetme hatası:', error);
    }
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name, address: branch.address
    });
    setShowModal(true);
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


  const resetForm = () => {
    setShowModal(false);
    setEditingBranch(null);
    setFormData({
      name: '', address: ''
    });
  };

  if (loading) {
    return (
      <Loading message="Şubeler yükleniyor..." />
    );
  }

  return (
    <div>
      <PageTitle
        setShowModal={setShowModal}
        pageTitle="Şubeler"
        pageDescription="Kulüp şubelerini yönetebilirsiniz."
        firstButtonText="Yeni Şube Ekle"
        pageIcon={<AccountTreeOutlinedIcon />}
      />
      {/* Form Modal */}
      {typeof document !== 'undefined' && createPortal(
      <EditModal className='max-w-lg' open={showModal} onClose={() => resetForm()} onSubmit={() => handleSubmit} editing={!!editingBranch}>
          <ModalTitle
            modalTitle={editingBranch ? 'Şube Güncelle' : 'Yeni Şube Ekle'}
          />
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Şube Adı
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Örnek: Merkez Şube"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adres
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Şube adresini giriniz"
                rows={3}
                required
              />
            </div>
          </form>
        </EditModal>,
        document.body
      )}

      {/* Branches List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <Loading message="Şubeler yükleniyor..." />
        ) : branches.length === 0 ? (
          <div className="p-8 text-center">
            <Building className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Şube bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500">
              İlk şubenizi eklemek için &quot;Yeni Şube&quot; butonuna tıklayın.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ">
                    Şube Adı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ">
                    Adres
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ">
                    Oluşturulma Tarihi
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase ">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {branches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building className="h-5 w-5 text-gray-400 mr-3" />
                        <div className="text-sm font-medium text-gray-900">
                          {branch.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-gray-600">
                          {branch.address}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {branch.createdAt.toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <IconButtons
                        item={branch}
                        onEdit={() => handleEdit(branch)}
                        onDelete={() => handleDelete(branch.id)}
                      />
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