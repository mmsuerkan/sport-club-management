'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit2, Trash2, FileText, Download, Upload, Calendar } from 'lucide-react';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase/config';

interface Document {
  id: string;
  name: string;
  description: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  createdAt: Date;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'documents'));
      const documentsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Document[];
      setDocuments(documentsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    } catch (error) {
      console.error('Belgeler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Dosya boyutu kontrolü (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Dosya boyutu 10MB\'dan küçük olmalıdır.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadFile = async (file: File): Promise<{ url: string; fileName: string }> => {
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const storageRef = ref(storage, `documents/${fileName}`);
    
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    
    return { url, fileName };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.description.trim()) return;
    if (!editingDocument && !selectedFile) {
      alert('Lütfen bir dosya seçiniz.');
      return;
    }

    try {
      setUploading(true);
      
      if (editingDocument) {
        // Güncelleme
        const updateData: any = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          updatedAt: new Date()
        };

        // Yeni dosya yüklenmişse
        if (selectedFile) {
          // Eski dosyayı sil
          if (editingDocument.fileName) {
            const oldFileRef = ref(storage, `documents/${editingDocument.fileName}`);
            try {
              await deleteObject(oldFileRef);
            } catch (error) {
              console.log('Eski dosya silinemedi:', error);
            }
          }

          // Yeni dosyayı yükle
          const { url, fileName } = await uploadFile(selectedFile);
          updateData.fileUrl = url;
          updateData.fileName = fileName;
          updateData.fileSize = selectedFile.size;
        }

        await updateDoc(doc(db, 'documents', editingDocument.id), updateData);
      } else {
        // Yeni ekleme
        if (!selectedFile) return;
        
        const { url, fileName } = await uploadFile(selectedFile);
        const newDocumentRef = doc(collection(db, 'documents'));
        await setDoc(newDocumentRef, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          fileName,
          fileUrl: url,
          fileSize: selectedFile.size,
          createdAt: new Date()
        });
      }
      
      setFormData({ name: '', description: '' });
      setSelectedFile(null);
      setShowForm(false);
      setEditingDocument(null);
      fetchDocuments();
    } catch (error) {
      console.error('Belge kaydetme hatası:', error);
      alert('Belge kaydedilirken bir hata oluştu.');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (document: Document) => {
    setEditingDocument(document);
    setFormData({ name: document.name, description: document.description });
    setSelectedFile(null);
    setShowForm(true);
  };

  const handleDelete = async (document: Document) => {
    if (confirm('Bu belgeyi silmek istediğinizden emin misiniz?')) {
      try {
        // Dosyayı storage'dan sil
        if (document.fileName) {
          const fileRef = ref(storage, `documents/${document.fileName}`);
          try {
            await deleteObject(fileRef);
          } catch (error) {
            console.log('Dosya silinemedi:', error);
          }
        }

        // Firestore'dan sil
        await deleteDoc(doc(db, 'documents', document.id));
        fetchDocuments();
      } catch (error) {
        console.error('Belge silme hatası:', error);
        alert('Belge silinirken bir hata oluştu.');
      }
    }
  };

  const handleDownload = (document: Document) => {
    window.open(document.fileUrl, '_blank');
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingDocument(null);
    setFormData({ name: '', description: '' });
    setSelectedFile(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Belgeler</h1>
          <p className="text-gray-600 mt-2">Klüp belgelerini yönetin</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Yeni Belge
        </button>
      </div>

      {/* Form Modal */}
      {showForm && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={handleCancel}>
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl border border-gray-100 transform transition-all" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">
              {editingDocument ? 'Belge Düzenle' : 'Yeni Belge Ekle'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Belge Adı
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Örnek: Kurallar ve Yönetmelikler"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Belge hakkında açıklama"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dosya {editingDocument ? '(Değiştirmek için yeni dosya seçin)' : ''}
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                        <span>Dosya seç</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          onChange={handleFileSelect}
                          accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                        />
                      </label>
                      <p className="pl-1">veya sürükle bırak</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PDF, Word, Excel, PowerPoint, resim dosyaları (max 10MB)
                    </p>
                    {selectedFile && (
                      <p className="text-sm text-green-600 mt-2">
                        Seçilen: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Yükleniyor...
                    </>
                  ) : (
                    editingDocument ? 'Güncelle' : 'Kaydet'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={uploading}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-700 py-2 rounded-lg transition-colors"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Documents List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Belgeler yükleniyor...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Belge bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500">
              İlk belgenizi eklemek için &quot;Yeni Belge&quot; butonuna tıklayın.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Belge Adı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Açıklama
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dosya Boyutu
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
                {documents.map((document) => (
                  <tr key={document.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-3" />
                        <div className="text-sm font-medium text-gray-900">
                          {document.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-xs truncate">
                        {document.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatFileSize(document.fileSize)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-1" />
                        {document.createdAt.toLocaleDateString('tr-TR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDownload(document)}
                          className="text-green-600 hover:text-green-700 p-1 hover:bg-green-50 rounded"
                          title="İndir"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(document)}
                          className="text-blue-600 hover:text-blue-700 p-1 hover:bg-blue-50 rounded"
                          title="Düzenle"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(document)}
                          className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                          title="Sil"
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