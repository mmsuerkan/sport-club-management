'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Edit2, Trash2, Phone, Mail, Award, Building, Clock, ShieldUser, Users } from 'lucide-react';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import PageTitle from '@/components/page-title';
import ModalTitle from '@/components/modal-title';
import Loading from '@/components/loading';
import BasicModal from '@/components/modal';

// Group Assignment Modal Component
function GroupAssignmentModal({ 
  trainer, 
  groups, 
  onSave, 
  onClose 
}: {
  trainer: Trainer;
  groups: Group[];
  onSave: (trainerId: string, selectedGroupIds: string[]) => void;
  onClose: () => void;
}) {
  const [selectedGroups, setSelectedGroups] = useState<string[]>(
    trainer.groupIds || (trainer.groupId ? [trainer.groupId] : [])
  );
  const [groupsByBranch, setGroupsByBranch] = useState<{[key: string]: Group[]}>({});

  useEffect(() => {
    // Group groups by branch
    const grouped = groups.reduce((acc, group) => {
      if (!acc[group.branchId]) {
        acc[group.branchId] = [];
      }
      acc[group.branchId].push(group);
      return acc;
    }, {} as {[key: string]: Group[]});
    setGroupsByBranch(grouped);
  }, [groups]);

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleSave = () => {
    onSave(trainer.id, selectedGroups);
  };

  return (
    <BasicModal className='max-w-4xl' open={true} onClose={onClose}>
      <ModalTitle
        modalTitle={`${trainer.fullName} - Grup Ataması`}
        onClose={onClose}
      />
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        <div className="text-sm text-gray-600 mb-4">
          Bu antrenörü atamak istediğiniz grupları seçiniz:
        </div>
        
        {Object.entries(groupsByBranch).map(([branchId, branchGroups]) => {
          const branchName = branchGroups[0]?.branchName || 'Bilinmeyen Şube';
          return (
            <div key={branchId} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <Building className="h-4 w-4 mr-2" />
                {branchName}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {branchGroups.map(group => (
                  <label
                    key={group.id}
                    className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroups.includes(group.id)}
                      onChange={() => handleGroupToggle(group.id)}
                      className="mr-3 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{group.name}</div>
                      <div className="text-xs text-gray-500 flex items-center mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        {group.time}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          );
        })}

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-600">
            Seçilen grup sayısı: <span className="font-medium">{selectedGroups.length}</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-white rounded-md bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              Kaydet
            </button>
          </div>
        </div>
      </div>
    </BasicModal>
  );
}

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

interface Trainer {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  specialization: string;
  experience: string;
  certification: string;
  salary: string;
  branchId: string;
  branchName: string;
  groupId: string; // Backward compatibility için
  groupName: string; // Backward compatibility için
  groupIds?: string[]; // Çoklu grup ataması
  groupNames?: string[]; // Çoklu grup ataması
  notes: string;
  createdAt: Date;
  userId?: string; // Kullanıcı hesabı ile ilişkilendirme
}

export default function TrainersPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<Trainer | null>(null);
  const [assigningTrainer, setAssigningTrainer] = useState<Trainer | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    specialization: '',
    experience: '',
    certification: '',
    salary: '',
    branchId: '',
    groupId: '',
    notes: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrainers();
    fetchBranches();
    fetchGroups();
  }, []);

  useEffect(() => {
    // Filter groups when branch changes
    if (formData.branchId) {
      const filtered = groups.filter(group => group.branchId === formData.branchId);
      setFilteredGroups(filtered);
      // Reset group selection if current group doesn't belong to selected branch
      if (formData.groupId && !filtered.find(g => g.id === formData.groupId)) {
        setFormData(prev => ({ ...prev, groupId: '' }));
      }
    } else {
      setFilteredGroups([]);
      setFormData(prev => ({ ...prev, groupId: '' }));
    }
  }, [formData.branchId, groups, formData.groupId]);

  // Update trainer names when branches or groups change
  useEffect(() => {
    if (branches.length > 0 || groups.length > 0) {
      setTrainers(prevTrainers =>
        prevTrainers.map(trainer => {
          const branch = branches.find(b => b.id === trainer.branchId);
          const group = groups.find(g => g.id === trainer.groupId);
          return {
            ...trainer,
            branchName: branch?.name || trainer.branchName || '',
            groupName: group?.name || trainer.groupName || ''
          };
        })
      );
    }
  }, [branches, groups]);

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
      const querySnapshot = await getDocs(collection(db, 'groups'));
      const groupsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Group[];
      setGroups(groupsData);
    } catch (error) {
      console.error('Gruplar yüklenirken hata:', error);
    }
  };

  const fetchTrainers = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'trainers'));
      const trainersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Trainer[];
      setTrainers(trainersData);
    } catch (error) {
      console.error('Antrenörler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.branchId) return;

    try {
      const selectedBranch = branches.find(b => b.id === formData.branchId);
      const selectedGroup = groups.find(g => g.id === formData.groupId);

      const trainerData = {
        ...formData,
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        specialization: formData.specialization.trim(),
        experience: formData.experience.trim(),
        certification: formData.certification.trim(),
        salary: formData.salary.trim(),
        notes: formData.notes.trim(),
        branchName: selectedBranch?.name || '',
        groupName: selectedGroup?.name || ''
      };

      if (editingTrainer) {
        await updateDoc(doc(db, 'trainers', editingTrainer.id), {
          ...trainerData,
          updatedAt: new Date()
        });
      } else {
        const newTrainerRef = doc(collection(db, 'trainers'));
        await setDoc(newTrainerRef, {
          ...trainerData,
          createdAt: new Date()
        });
      }

      resetForm();
      fetchTrainers();
    } catch (error) {
      console.error('Antrenör kaydetme hatası:', error);
    }
  };

  const handleEdit = (trainer: Trainer) => {
    setEditingTrainer(trainer);
    setFormData({
      fullName: trainer.fullName || '',
      phone: trainer.phone || '',
      email: trainer.email || '',
      specialization: trainer.specialization || '',
      experience: trainer.experience || '',
      certification: trainer.certification || '',
      salary: trainer.salary || '',
      branchId: trainer.branchId || '',
      groupId: trainer.groupId || '',
      notes: trainer.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (trainerId: string) => {
    if (confirm('Bu antrenörü silmek istediğinizden emin misiniz?')) {
      try {
        await deleteDoc(doc(db, 'trainers', trainerId));
        fetchTrainers();
      } catch (error) {
        console.error('Antrenör silme hatası:', error);
      }
    }
  };

  const handleGroupAssignment = (trainer: Trainer) => {
    setAssigningTrainer(trainer);
    setShowGroupModal(true);
  };

  const updateTrainerGroups = async (trainerId: string, selectedGroupIds: string[]) => {
    try {
      const selectedGroups = groups.filter(g => selectedGroupIds.includes(g.id));
      const groupNames = selectedGroups.map(g => g.name);
      
      await updateDoc(doc(db, 'trainers', trainerId), {
        groupIds: selectedGroupIds,
        groupNames: groupNames,
        updatedAt: new Date()
      });
      
      setShowGroupModal(false);
      setAssigningTrainer(null);
      fetchTrainers();
    } catch (error) {
      console.error('Grup atama hatası:', error);
      alert('Grup atama işlemi başarısız oldu. Lütfen tekrar deneyin.');
    }
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingTrainer(null);
    setFormData({
      fullName: '',
      phone: '',
      email: '',
      specialization: '',
      experience: '',
      certification: '',
      salary: '',
      branchId: '',
      groupId: '',
      notes: ''
    });
  };

  return (
    <div>
      <PageTitle
        setEditingUser={undefined}
        setShowModal={setShowModal}
        pageTitle="Antrenörler"
        pageDescription="Antrenör kayıtlarını yönetebilirsiniz"
        firstButtonText="Yeni Antrenör Ekle"
        pageIcon={<ShieldUser />}
      />
      {/* Form Modal */}
      {showModal && typeof document !== 'undefined' && createPortal(
        <BasicModal className='max-w-3x1' open={showModal} onClose={() => resetForm()}>
          <ModalTitle
            modalTitle={editingTrainer ? 'Antrenör Düzenle' : 'Yeni Antrenör Ekle'}
            onClose={resetForm}
          />
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ad Soyad *
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-posta
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Şube *
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
                  Grup
                </label>
                <select
                  value={formData.groupId}
                  onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!formData.branchId}
                >
                  <option value="">Grup seçiniz</option>
                  {filteredGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.time})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Uzmanlık Alanı
                </label>
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Futbol, Basketbol, Yüzme vb."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deneyim
                </label>
                <input
                  type="text"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="5 yıl, 10 yıl vb."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sertifikalar
                </label>
                <input
                  type="text"
                  value={formData.certification}
                  onChange={(e) => setFormData({ ...formData, certification: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="UEFA A Lisansı, TFF Antrenör Lisansı vb."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maaş
                </label>
                <input
                  type="text"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="15.000 TL vb."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notlar
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Ek bilgiler, özel notlar vb."
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
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
                {editingTrainer ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>

          </form>
        </BasicModal>,
        document.body
      )}

      {/* Group Assignment Modal */}
      {showGroupModal && assigningTrainer && typeof document !== 'undefined' && createPortal(
        <GroupAssignmentModal
          trainer={assigningTrainer}
          groups={groups}
          onSave={updateTrainerGroups}
          onClose={() => {
            setShowGroupModal(false);
            setAssigningTrainer(null);
          }}
        />,
        document.body
      )}

      {/* Trainers List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <Loading message="Antrenörler yükleniyor..." />
        ) : trainers.length === 0 ? (
          <div className="p-8 text-center">
            <ShieldUser className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Antrenör bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500">
              İlk antrenörü eklemek için &quot;Yeni Antrenör&quot; butonuna tıklayın.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ">
                    Antrenör
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ">
                    İletişim
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ">
                    Şube & Grup
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ">
                    Kayıt Tarihi
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase ">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trainers.map((trainer) => (
                  <tr key={trainer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <ShieldUser className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {trainer.fullName}
                          </div>
                          {trainer.experience && (
                            <div className="text-xs text-gray-500">
                              Deneyim: {trainer.experience}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="h-3 w-3 mr-2" />
                          {trainer.phone}
                        </div>
                        {trainer.email && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="h-3 w-3 mr-2" />
                            {trainer.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-600">
                          <Building className="h-3 w-3 mr-2" />
                          {trainer.branchName}
                        </div>
                        {/* Çoklu grup gösterimi */}
                        {(trainer.groupIds && trainer.groupIds.length > 0) ? (
                          <div className="space-y-1">
                            {trainer.groupNames?.map((groupName, index) => (
                              <div key={index} className="flex items-center text-sm text-gray-600">
                                <Clock className="h-3 w-3 mr-2" />
                                {groupName}
                              </div>
                            ))}
                          </div>
                        ) : trainer.groupName && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Clock className="h-3 w-3 mr-2" />
                            {trainer.groupName}
                          </div>
                        )}
                        {trainer.specialization && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Award className="h-3 w-3 mr-2" />
                            {trainer.specialization}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {trainer.createdAt.toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(trainer)}
                          className="text-blue-400 hover:text-blue-700 p-1"
                          title="Antrenör Düzenle"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleGroupAssignment(trainer)}
                          className="text-green-400 hover:text-green-700 p-1"
                          title="Gruplara Ata"
                        >
                          <Users size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(trainer.id)}
                          className="text-red-400 hover:text-red-700 p-1"
                          title="Antrenör Sil"
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