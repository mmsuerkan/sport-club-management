'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage } from '@/lib/firebase/config';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import Image from 'next/image';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Tag,
  Image as ImageIcon,
  Edit2,
  Trash2,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Grid,
  List,
  Eye,
  Heart,
  Share2,
  Star,
  UserPlus,
  CalendarDays,
  User,
  CalendarClock
} from 'lucide-react';
import PageTitle from '@/components/page-title';
import Loading from '@/components/loading';
import ModalTitle from '@/components/modal-title';
import BasicModal from '@/components/modal';
import { createPortal } from 'react-dom';

interface Event {
  id: string;
  title: string;
  description: string;
  category: 'spor' | 'egitim' | 'sosyal' | 'kultur' | 'saglik' | 'diger';
  tags: string[];
  startDate: Date;
  endDate: Date;
  location: string;
  maxAttendees: number;
  attendees: string[];
  imageUrl?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: Date;
  updatedAt?: Date;
  isPublic: boolean;
  isFeatured: boolean;
}

const categories = {
  spor: { label: 'Spor', color: 'bg-blue-500', lightColor: 'bg-blue-50 text-blue-700' },
  egitim: { label: 'Eğitim', color: 'bg-green-500', lightColor: 'bg-green-50 text-green-700' },
  sosyal: { label: 'Sosyal', color: 'bg-purple-500', lightColor: 'bg-purple-50 text-purple-700' },
  kultur: { label: 'Kültür', color: 'bg-yellow-500', lightColor: 'bg-yellow-50 text-yellow-700' },
  saglik: { label: 'Sağlık', color: 'bg-red-500', lightColor: 'bg-red-50 text-red-700' },
  diger: { label: 'Diğer', color: 'bg-gray-500', lightColor: 'bg-gray-50 text-gray-700' }
};

export default function EventsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'calendar'>('grid');
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'spor' as Event['category'],
    tags: [] as string[],
    startDate: '',
    endDate: '',
    location: '',
    maxAttendees: 50,
    isPublic: true,
    isFeatured: false
  });

  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchEvents();
  }, [user, router]);

  const fetchEvents = async () => {
    try {
      setLoading(true);

      const eventsQuery = query(
        collection(db, 'events'),
        orderBy('startDate', 'desc'),
        limit(50)
      );

      const snapshot = await getDocs(eventsQuery);
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate?.toDate() || new Date(),
        endDate: doc.data().endDate?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as Event[];

      setEvents(eventsData);
    } catch (error) {
      console.error('Etkinlikler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Dosya boyutu 5MB\'dan küçük olmalıdır');
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async () => {
    if (!imageFile || !user) return null;

    try {
      setUploadingImage(true);
      const storageRef = ref(storage, `events/${Date.now()}-${imageFile.name}`);
      await uploadBytes(storageRef, imageFile);
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (error) {
      console.error('Resim yüklenirken hata:', error);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      let imageUrl = editingEvent?.imageUrl;

      if (imageFile) {
        imageUrl = await uploadImage() || undefined;
      }

      const eventData = {
        ...formData,
        startDate: Timestamp.fromDate(new Date(formData.startDate)),
        endDate: Timestamp.fromDate(new Date(formData.endDate)),
        imageUrl,
        attendees: editingEvent?.attendees || [],
        updatedAt: Timestamp.now()
      };

      if (editingEvent) {
        await updateDoc(doc(db, 'events', editingEvent.id), eventData);
      } else {
        await addDoc(collection(db, 'events'), {
          ...eventData,
          createdBy: user.uid,
          createdByName: user.email?.split('@')[0] || 'Kullanıcı',
          createdAt: Timestamp.now()
        });
      }

      setShowModal(false);
      resetForm();
      fetchEvents();
    } catch (error) {
      console.error('Etkinlik kaydedilirken hata:', error);
      alert('Etkinlik kaydedilemedi');
    }
  };

  const handleDelete = async () => {
    if (!eventToDelete) return;

    try {
      // Delete image from storage if exists
      if (eventToDelete.imageUrl) {
        try {
          const imageRef = ref(storage, eventToDelete.imageUrl);
          await deleteObject(imageRef);
        } catch (error) {
          console.error('Resim silinirken hata:', error);
        }
      }

      await deleteDoc(doc(db, 'events', eventToDelete.id));
      setShowDeleteModal(false);
      setEventToDelete(null);
      fetchEvents();
    } catch (error) {
      console.error('Etkinlik silinirken hata:', error);
      alert('Etkinlik silinemedi');
    }
  };

  const handleAttend = async (event: Event) => {
    if (!user) return;

    try {
      const isAttending = event.attendees.includes(user.uid);
      const updatedAttendees = isAttending
        ? event.attendees.filter(id => id !== user.uid)
        : [...event.attendees, user.uid];

      await updateDoc(doc(db, 'events', event.id), {
        attendees: updatedAttendees,
        updatedAt: Timestamp.now()
      });

      fetchEvents();
    } catch (error) {
      console.error('Katılım durumu güncellenirken hata:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'spor',
      tags: [],
      startDate: '',
      endDate: '',
      location: '',
      maxAttendees: 50,
      isPublic: true,
      isFeatured: false
    });
    setImageFile(null);
    setImagePreview(null);
    setEditingEvent(null);
    setTagInput('');
    setShowModal(false);
    setEditingEvent(null)
  };

  const openEditModal = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      category: event.category,
      tags: event.tags,
      startDate: format(event.startDate, "yyyy-MM-dd'T'HH:mm"),
      endDate: format(event.endDate, "yyyy-MM-dd'T'HH:mm"),
      location: event.location,
      maxAttendees: event.maxAttendees,
      isPublic: event.isPublic,
      isFeatured: event.isFeatured
    });
    setImagePreview(event.imageUrl || null);
    setShowModal(true);
  };

  const filteredEvents = events.filter(event => {
    const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory;
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const calendarDays = eachDayOfInterval({
    start: startOfMonth(selectedMonth),
    end: endOfMonth(selectedMonth)
  });

  const getEventsForDay = (day: Date) => {
    return filteredEvents.filter(event =>
      isSameDay(event.startDate, day) ||
      (event.startDate <= day && event.endDate >= day)
    );
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  if (loading) {
    return (
      <Loading message="Etkinlikler yükleniyor..." />
    );
  }

  return (
    <div >
      {/* Header */}
      <PageTitle
        setEditingUser={undefined}
        setShowModal={setShowModal}
        pageTitle="Etkinlikler"
        pageDescription="Kulüp etkinliklerini yönetebilir ve takip edebilirsiniz."
        firstButtonText="Yeni Etkinlik Ekle"
        pageIcon={<CalendarClock />}
      />
      {/* Filters and View Mode */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Etkinlik ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 items-center">
            <Filter className="text-gray-400 h-5 w-5" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tüm Kategoriler</option>
              {Object.entries(categories).map(([key, value]) => (
                <option key={key} value={key}>{value.label}</option>
              ))}
            </select>
          </div>

          {/* View Mode */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'grid'
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'list'
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              <List className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'calendar'
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              <CalendarDays className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Events Display */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer"
              onClick={() => {
                setSelectedEvent(event);
                setShowEventModal(true);
              }}
            >
              {/* Event Image */}
              <div className="relative h-48 bg-gradient-to-br from-blue-400 to-purple-400 overflow-hidden">
                {event.imageUrl ? (
                  <Image
                    src={event.imageUrl}
                    alt={event.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Calendar className="h-16 w-16 text-white/50" />
                  </div>
                )}

                {/* Category Badge */}
                <div className="absolute top-4 left-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${categories[event.category].lightColor}`}>
                    {categories[event.category].label}
                  </span>
                </div>

                {/* Featured Badge */}
                {event.isFeatured && (
                  <div className="absolute top-4 right-4">
                    <div className="bg-yellow-400 text-yellow-900 p-2 rounded-full">
                      <Star className="h-4 w-4 fill-current" />
                    </div>
                  </div>
                )}
              </div>

              {/* Event Details */}
              <div className="p-6">
                <h3 className="font-semibold text-lg text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {event.title}
                </h3>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {event.description}
                </p>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>{format(event.startDate, 'dd MMM yyyy HH:mm', { locale: tr })}</span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-500">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{event.location}</span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-500">
                    <Users className="h-4 w-4" />
                    <span>{event.attendees.length} / {event.maxAttendees} Katılımcı</span>
                  </div>
                </div>

                {/* Tags */}
                {event.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {event.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                        #{tag}
                      </span>
                    ))}
                    {event.tags.length > 3 && (
                      <span className="px-2 py-1 text-gray-400 text-xs">
                        +{event.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="flex gap-2">
                    {user && event.createdBy === user.uid && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(event);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEventToDelete(event);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAttend(event);
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${user && event.attendees.includes(user.uid)
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                  >
                    {user && event.attendees.includes(user.uid) ? (
                      <>
                        <Check className="h-4 w-4 inline mr-1" />
                        Katılıyorum
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 inline mr-1" />
                        Katıl
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ">
                    Etkinlik
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ">
                    Kategori
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ">
                    Konum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ">
                    Katılımcılar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {event.imageUrl ? (
                          <div className="relative h-10 w-10 rounded-lg overflow-hidden mr-3">
                            <Image
                              src={event.imageUrl}
                              alt={event.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center mr-3">
                            <Calendar className="h-5 w-5 text-white" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                            {event.title}
                            {event.isFeatured && <Star className="h-3 w-3 text-yellow-500 fill-current" />}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {event.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 inline-flex text-xs font-medium rounded-full ${categories[event.category].lightColor}`}>
                        {categories[event.category].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {format(event.startDate, 'dd MMM yyyy HH:mm', { locale: tr })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {event.location}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-900">
                          {event.attendees.length} / {event.maxAttendees}
                        </span>
                        <div className="ml-2 w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(event.attendees.length / event.maxAttendees) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedEvent(event);
                            setShowEventModal(true);
                          }}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {user && event.createdBy === user.uid && (
                          <>
                            <button
                              onClick={() => openEditModal(event)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEventToDelete(event);
                                setShowDeleteModal(true);
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleAttend(event)}
                          className={`ml-auto px-3 py-1 rounded-lg text-sm font-medium transition-colors ${user && event.attendees.includes(user.uid)
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                        >
                          {user && event.attendees.includes(user.uid) ? 'Katılıyorum' : 'Katıl'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'calendar' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {format(selectedMonth, 'MMMM yyyy', { locale: tr })}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setSelectedMonth(new Date())}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Bugün
              </button>
              <button
                onClick={() => setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
            {/* Day Headers */}
            {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(day => (
              <div key={day} className="bg-gray-50 p-2 text-center text-xs font-medium text-gray-700">
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {Array.from({ length: calendarDays[0].getDay() === 0 ? 6 : calendarDays[0].getDay() - 1 }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-white p-2 h-24" />
            ))}

            {calendarDays.map(day => {
              const dayEvents = getEventsForDay(day);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={`bg-white p-2 h-24 relative overflow-hidden ${isToday ? 'ring-2 ring-blue-500 ring-inset' : ''
                    }`}
                >
                  <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                    {format(day, 'd')}
                  </div>

                  {dayEvents.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {dayEvents.slice(0, 2).map((event, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            setSelectedEvent(event);
                            setShowEventModal(true);
                          }}
                          className={`text-xs p-1 rounded cursor-pointer truncate ${categories[event.category].lightColor
                            } hover:opacity-80 transition-opacity`}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-gray-500 pl-1">
                          +{dayEvents.length - 2} daha
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {typeof document !== 'undefined' && createPortal(
        <BasicModal className='max-w-lg' open={showModal} onClose={() => resetForm()}>
          <ModalTitle modalTitle={editingEvent ? 'Etkinliği Düzenle' : 'Yeni Etkinlik Ekle'} onClose={resetForm} />
          <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Etkinlik Görseli
              </label>
              <div className="flex items-center gap-4">
                <div className="relative w-32 h-32 bg-gray-100 rounded-lg overflow-hidden">
                  {imagePreview ? (
                    <>
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors"
                >
                  Görsel Seç
                </label>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Etkinlik Başlığı
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Açıklama
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                required
              />
            </div>

            {/* Category and Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategori
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as Event['category'] }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Object.entries(categories).map(([key, value]) => (
                    <option key={key} value={key}>{value.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Başlangıç
                </label>
                <input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bitiş
                </label>
                <input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  min={formData.startDate}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Location and Max Attendees */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Konum
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maksimum Katılımcı
                </label>
                <input
                  type="number"
                  value={formData.maxAttendees}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxAttendees: parseInt(e.target.value) }))}
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Etiketler
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Etiket ekle..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  Ekle
                </button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm flex items-center gap-1"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Options */}
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Herkese Açık</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isFeatured}
                  onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Öne Çıkan</span>
              </label>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={uploadingImage}
                className="flex-1 px-4 py-2 text-white rounded-md bg-gradient-to-r from-blue-500 to-purple-600"
              >
                {uploadingImage ? 'Yükleniyor...' : editingEvent ? 'Güncelle' : 'Ekle'}
              </button>
            </div>
          </form>
        </BasicModal>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && eventToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Etkinliği Sil
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                &quot;{eventToDelete.title}&quot; etkinliğini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setEventToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Sil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Event Header Image */}
            <div className="relative h-64 bg-gradient-to-br from-blue-400 to-purple-400">
              {selectedEvent.imageUrl ? (
                <Image
                  src={selectedEvent.imageUrl}
                  alt={selectedEvent.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Calendar className="h-20 w-20 text-white/50" />
                </div>
              )}

              <button
                onClick={() => {
                  setShowEventModal(false);
                  setSelectedEvent(null);
                }}
                className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/30 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Category and Featured Badges */}
              <div className="absolute bottom-4 left-4 flex gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${categories[selectedEvent.category].lightColor}`}>
                  {categories[selectedEvent.category].label}
                </span>
                {selectedEvent.isFeatured && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-400 text-yellow-900 flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Öne Çıkan
                  </span>
                )}
              </div>
            </div>

            {/* Event Details */}
            <div className="p-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">{selectedEvent.title}</h2>

              <p className="text-gray-600 mb-6">{selectedEvent.description}</p>

              {/* Event Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Tarih ve Saat</p>
                      <p className="text-gray-600">
                        {format(selectedEvent.startDate, 'dd MMMM yyyy HH:mm', { locale: tr })} -
                        {format(selectedEvent.endDate, 'HH:mm', { locale: tr })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Konum</p>
                      <p className="text-gray-600">{selectedEvent.location}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Oluşturan</p>
                      <p className="text-gray-600">{selectedEvent.createdByName || 'Kullanıcı'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Katılımcılar</p>
                      <p className="text-gray-600 mb-2">
                        {selectedEvent.attendees.length} / {selectedEvent.maxAttendees} Kişi
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(selectedEvent.attendees.length / selectedEvent.maxAttendees) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {selectedEvent.tags.length > 0 && (
                    <div className="flex items-start gap-3">
                      <Tag className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900 mb-2">Etiketler</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedEvent.tags.map((tag, index) => (
                            <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 border-t">
                <button
                  onClick={() => handleAttend(selectedEvent)}
                  className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${user && selectedEvent.attendees.includes(user.uid)
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                    }`}
                >
                  {user && selectedEvent.attendees.includes(user.uid) ? (
                    <>
                      <Check className="h-5 w-5" />
                      Katılıyorum
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-5 w-5" />
                      Etkinliğe Katıl
                    </>
                  )}
                </button>

                <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Paylaş
                </button>

                <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Favorile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}