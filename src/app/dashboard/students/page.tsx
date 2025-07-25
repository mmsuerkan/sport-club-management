'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Edit2, Trash2, GraduationCap, Phone, Mail, Building, Clock } from 'lucide-react';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { StudentDebtService } from '@/lib/firebase/student-debt-service';
import PageTitle from '@/components/page-title';
import ModalTitle from '@/components/modal-title';
import Loading from '@/components/loading';
import BasicModal from '@/components/modal';

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
  birthDate: string;
  phone: string;
  email: string;
  address: string;
  tcNo: string;
  parentName: string;
  parentPhone: string;
  emergencyContact: string;
  emergencyPhone: string;
  notes: string;
  branchId: string;
  branchName: string;
  groupId: string;
  groupName: string;
  createdAt: Date;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    birthDate: '',
    phone: '',
    email: '',
    address: '',
    tcNo: '',
    parentName: '',
    parentPhone: '',
    emergencyContact: '',
    emergencyPhone: '',
    notes: '',
    branchId: '',
    groupId: '',
    monthlyTuition: 1500, // Varsayılan aylık aidat
    createTuitionPlan: true // 12 aylık aidat planı oluştur
  });
  const [loading, setLoading] = useState(true);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  useEffect(() => {
    fetchStudents();
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

  // Update student names when branches or groups change
  useEffect(() => {
    if (branches.length > 0 || groups.length > 0) {
      setStudents(prevStudents =>
        prevStudents.map(student => {
          const branch = branches.find(b => b.id === student.branchId);
          const group = groups.find(g => g.id === student.groupId);
          return {
            ...student,
            branchName: branch?.name || student.branchName || '',
            groupName: group?.name || student.groupName || ''
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

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'students'));
      const studentsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Student[];
      setStudents(studentsData);
    } catch (error) {
      console.error('Öğrenciler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const addActivityLog = async (type: string, description: string, user?: string) => {
    try {
      await addDoc(collection(db, 'activity_logs'), {
        type,
        description,
        user,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Aktivite log eklenirken hata:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.branchId || !formData.groupId) return;

    try {
      const selectedBranch = branches.find(b => b.id === formData.branchId);
      const selectedGroup = groups.find(g => g.id === formData.groupId);

      const studentData = {
        ...formData,
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        tcNo: formData.tcNo.trim(),
        parentName: formData.parentName.trim(),
        parentPhone: formData.parentPhone.trim(),
        emergencyContact: formData.emergencyContact.trim(),
        emergencyPhone: formData.emergencyPhone.trim(),
        notes: formData.notes.trim(),
        branchName: selectedBranch?.name || '',
        groupName: selectedGroup?.name || ''
      };

      if (editingStudent) {
        // Güncelleme
        await updateDoc(doc(db, 'students', editingStudent.id), {
          ...studentData,
          updatedAt: new Date()
        });

        // Aktivite log'u ekle
        await addActivityLog(
          'member',
          'Öğrenci bilgileri güncellendi',
          formData.fullName.trim()
        );
      } else {
        // Yeni ekleme
        const newStudentRef = doc(collection(db, 'students'));
        await setDoc(newStudentRef, {
          ...studentData,
          createdAt: new Date()
        });

        // 12 aylık aidat planı oluştur
        if (formData.createTuitionPlan) {
          const currentDate = new Date();
          const academicYear = `${currentDate.getFullYear()}-${currentDate.getFullYear() + 1}`;
          
          await StudentDebtService.createYearlyTuition(
            newStudentRef.id,
            {
              name: formData.fullName.trim(),
              groupId: formData.groupId,
              groupName: selectedGroup?.name || '',
              branchId: formData.branchId,
              branchName: selectedBranch?.name || ''
            },
            formData.monthlyTuition,
            currentDate,
            academicYear
          );
        }

        // Aktivite log'u ekle
        await addActivityLog(
          'member',
          'Yeni öğrenci kaydı',
          formData.fullName.trim()
        );
      }

      resetForm();
      fetchStudents();
    } catch (error) {
      console.error('Öğrenci kaydetme hatası:', error);
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      fullName: student.fullName,
      birthDate: student.birthDate,
      phone: student.phone,
      email: student.email,
      address: student.address,
      tcNo: student.tcNo,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      emergencyContact: student.emergencyContact,
      emergencyPhone: student.emergencyPhone,
      notes: student.notes,
      branchId: student.branchId,
      groupId: student.groupId,
      monthlyTuition: 1500, // Edit modunda aidat oluşturma disabled
      createTuitionPlan: false // Edit modunda aidat oluşturma disabled
    });
    setShowModal(true);
  };

  const handleDelete = async (studentId: string) => {
    if (confirm('Bu öğrenciyi silmek istediğinizden emin misiniz?')) {
      try {
        await deleteDoc(doc(db, 'students', studentId));
        fetchStudents();
      } catch (error) {
        console.error('Öğrenci silme hatası:', error);
      }
    }
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingStudent(null);
    setFormData({
      fullName: '',
      birthDate: '',
      phone: '',
      email: '',
      address: '',
      tcNo: '',
      parentName: '',
      parentPhone: '',
      emergencyContact: '',
      emergencyPhone: '',
      notes: '',
      branchId: '',
      groupId: '',
      monthlyTuition: 1500,
      createTuitionPlan: true
    });
  };

  return (
    <div>
      <PageTitle
        setEditingUser={undefined}
        setShowModal={setShowModal}
        pageTitle="Öğrenciler"
        pageDescription="Öğrenci kayıtlarını yönetebilirsiniz."
        firstButtonText="Yeni Öğrenci Ekle"
        pageIcon={<GraduationCap />}
      />

      {/* Form Modal */}
      {typeof document !== 'undefined' && createPortal(
        <BasicModal className='max-w-3xl' open={showModal} onClose={() => resetForm()}>
          <ModalTitle
            modalTitle={editingStudent ? 'Öğrenci Düzenle' : 'Yeni Öğrenci Ekle'}
            onClose={resetForm}
          />
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Temel Bilgiler */}
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
                  Doğum Tarihi
                </label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  TC Kimlik No
                </label>
                <input
                  type="text"
                  value={formData.tcNo}
                  onChange={(e) => setFormData({ ...formData, tcNo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={11}
                />
              </div>

              {/* Şube ve Grup Seçimi */}
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
                  Grup *
                </label>
                <select
                  value={formData.groupId}
                  onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
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

              {/* Veli Bilgileri */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Veli Adı
                </label>
                <input
                  type="text"
                  value={formData.parentName}
                  onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Veli Telefonu
                </label>
                <input
                  type="tel"
                  value={formData.parentPhone}
                  onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Acil Durum */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Acil Durum Kişisi
                </label>
                <input
                  type="text"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Acil Durum Telefonu
                </label>
                <input
                  type="tel"
                  value={formData.emergencyPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Adres ve Notlar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adres
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notlar (Sağlık durumu vb.)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>

            {/* Aidat Ayarları - Sadece yeni öğrenci eklerken */}
            {!editingStudent && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-800 mb-3">💰 Aidat Ayarları</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Aylık Aidat (₺)
                    </label>
                    <input
                      type="number"
                      value={formData.monthlyTuition}
                      onChange={(e) => setFormData({ ...formData, monthlyTuition: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="50"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="createTuitionPlan"
                      checked={formData.createTuitionPlan}
                      onChange={(e) => setFormData({ ...formData, createTuitionPlan: e.target.checked })}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label htmlFor="createTuitionPlan" className="ml-2 block text-sm text-gray-700">
                      12 aylık aidat planı oluştur
                    </label>
                  </div>
                </div>

                {formData.createTuitionPlan && (
                  <div className="mt-3 p-3 bg-green-100 rounded-lg">
                    <p className="text-sm text-green-700">
                      📅 Bu öğrenci için {formatCurrency(formData.monthlyTuition)} aylık aidat ile 12 aylık ödeme planı oluşturulacak.
                      <br />
                      💰 Toplam yıllık tutar: <strong>{formatCurrency(formData.monthlyTuition * 12)}</strong>
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                {editingStudent ? 'Güncelle' : 'Kaydet'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 px-4 py-2 text-white rounded-md bg-gradient-to-r from-blue-500 to-purple-600"
              >
                İptal
              </button>
            </div>
          </form>
        </BasicModal>,
        document.body
      )}

      {/* Students List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <Loading message="Öğrenciler yükleniyor..." />
        ) : students.length === 0 ? (
          <div className="p-8 text-center">
            <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Öğrenci bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500">
              İlk öğrenciyi eklemek için &quot;Yeni Öğrenci&quot; butonuna tıklayın.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ">
                    Öğrenci
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
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <GraduationCap className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {student.fullName}
                          </div>
                          {student.birthDate && (
                            <div className="text-xs text-gray-500">
                              {new Date(student.birthDate).toLocaleDateString('tr-TR')}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="h-3 w-3 mr-2" />
                          {student.phone}
                        </div>
                        {student.email && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="h-3 w-3 mr-2" />
                            {student.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-600">
                          <Building className="h-3 w-3 mr-2" />
                          {student.branchName}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="h-3 w-3 mr-2" />
                          {student.groupName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {student.createdAt.toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(student)}
                          className="text-blue-400 hover:text-blue-700 p-1"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(student.id)}
                          className="text-red-400 hover:text-red-700 p-1"
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