'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Edit2, Trash2, UserCheck, Phone, Mail, Briefcase, Clock, UsersIcon } from 'lucide-react';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import PageTitle from '@/components/page-title';
import ModalTitle from '@/components/modal-title';
import Loading from '@/components/loading';
import BasicModal from '@/components/modal';

interface Branch {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  position: string;
  department: string;
  salary: string;
  startDate: string;
  branchId: string;
  branchName: string;
  notes: string;
  createdAt: Date;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    position: '',
    department: '',
    salary: '',
    startDate: '',
    branchId: '',
    notes: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
    fetchBranches();
  }, []);

  // Update employee branch names when branches change
  useEffect(() => {
    if (branches.length > 0) {
      setEmployees(prevEmployees =>
        prevEmployees.map(employee => {
          const branch = branches.find(b => b.id === employee.branchId);
          return {
            ...employee,
            branchName: branch?.name || employee.branchName || ''
          };
        })
      );
    }
  }, [branches]);

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

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'employees'));
      const employeesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Employee[];
      setEmployees(employeesData);
    } catch (error) {
      console.error('Çalışanlar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.phone.trim() || !formData.branchId) return;

    try {
      const selectedBranch = branches.find(b => b.id === formData.branchId);

      const employeeData = {
        ...formData,
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        position: formData.position.trim(),
        department: formData.department.trim(),
        salary: formData.salary.trim(),
        notes: formData.notes.trim(),
        branchName: selectedBranch?.name || ''
      };

      if (editingEmployee) {
        // Güncelleme
        await updateDoc(doc(db, 'employees', editingEmployee.id), {
          ...employeeData,
          updatedAt: new Date()
        });
      } else {
        // Yeni ekleme
        const newEmployeeRef = doc(collection(db, 'employees'));
        await setDoc(newEmployeeRef, {
          ...employeeData,
          createdAt: new Date()
        });
      }

      resetForm();
      fetchEmployees();
    } catch (error) {
      console.error('Çalışan kaydetme hatası:', error);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      fullName: employee.fullName || '',
      phone: employee.phone || '',
      email: employee.email || '',
      position: employee.position || '',
      department: employee.department || '',
      salary: employee.salary || '',
      startDate: employee.startDate || '',
      branchId: employee.branchId || '',
      notes: employee.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (employeeId: string) => {
    if (confirm('Bu çalışanı silmek istediğinizden emin misiniz?')) {
      try {
        await deleteDoc(doc(db, 'employees', employeeId));
        fetchEmployees();
      } catch (error) {
        console.error('Çalışan silme hatası:', error);
      }
    }
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingEmployee(null);
    setFormData({
      fullName: '',
      phone: '',
      email: '',
      position: '',
      department: '',
      salary: '',
      startDate: '',
      branchId: '',
      notes: ''
    });
  };

  return (
    <div>
      <PageTitle
        setEditingUser={undefined}
        setShowModal={setShowModal}
        pageTitle="Çalışanlar"
        pageDescription="Kulüp çalışanlarını yönetebilirsiniz."
        firstButtonText="Yeni Çalışan Ekle"
        pageIcon={<UsersIcon />}
      />

      {/* Form Modal */}
      {typeof document !== 'undefined' && createPortal(
        <BasicModal className='max-w-lg' open={showModal} onClose={() => resetForm()}>
          <ModalTitle
            modalTitle={editingEmployee ? 'Çalışan Düzenle' : 'Yeni Çalışan Ekle'}
            onClose={resetForm}
          />
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  Pozisyon
                </label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Pozisyon seçiniz</option>
                  <option value="Genel Müdür">Genel Müdür</option>
                  <option value="Şube Müdürü">Şube Müdürü</option>
                  <option value="İK Uzmanı">İK Uzmanı</option>
                  <option value="Muhasebe Uzmanı">Muhasebe Uzmanı</option>
                  <option value="Pazarlama Uzmanı">Pazarlama Uzmanı</option>
                  <option value="Sekreter">Sekreter</option>
                  <option value="Resepsiyon Görevlisi">Resepsiyon Görevlisi</option>
                  <option value="Temizlik Görevlisi">Temizlik Görevlisi</option>
                  <option value="Güvenlik Görevlisi">Güvenlik Görevlisi</option>
                  <option value="Teknik Personel">Teknik Personel</option>
                  <option value="Diğer">Diğer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departman
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Departman seçiniz</option>
                  <option value="Yönetim">Yönetim</option>
                  <option value="İnsan Kaynakları">İnsan Kaynakları</option>
                  <option value="Muhasebe & Finans">Muhasebe & Finans</option>
                  <option value="Pazarlama & Satış">Pazarlama & Satış</option>
                  <option value="Operasyon">Operasyon</option>
                  <option value="Teknik">Teknik</option>
                  <option value="Güvenlik">Güvenlik</option>
                  <option value="Temizlik">Temizlik</option>
                  <option value="Diğer">Diğer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maaş
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    className="w-full pl-3 pr-12 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="12.000"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-gray-500 text-sm font-medium">₺</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  İşe Başlama Tarihi
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Notlar */}
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
                {editingEmployee ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </form>
        </BasicModal>
        ,
        document.body
      )}

      {/* Employees List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <Loading message="Çalışanlar yükleniyor..." />
        ) : employees.length === 0 ? (
          <div className="p-8 text-center">
            <UserCheck className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Çalışan bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500">
              İlk çalışanı eklemek için &quot;Yeni Çalışan&quot; butonuna tıklayın.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ">
                    Çalışan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ">
                    İletişim
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ">
                    Pozisyon & Şube
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ">
                    Başlama Tarihi
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase ">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserCheck className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {employee.fullName}
                          </div>
                          {employee.department && (
                            <div className="text-xs text-gray-500">
                              {employee.department}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="h-3 w-3 mr-2" />
                          {employee.phone}
                        </div>
                        {employee.email && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="h-3 w-3 mr-2" />
                            {employee.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {employee.position && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Briefcase className="h-3 w-3 mr-2" />
                            {employee.position}
                          </div>
                        )}
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="h-3 w-3 mr-2" />
                          {employee.branchName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {employee.startDate ? new Date(employee.startDate).toLocaleDateString('tr-TR') : '-'}
                      </div>
                      {employee.salary && (
                        <div className="text-xs text-gray-500">
                          {employee.salary} ₺
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(employee)}
                          className="text-blue-400 hover:text-blue-700 p-1"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(employee.id)}
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