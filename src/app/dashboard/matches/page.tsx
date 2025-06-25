'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Search,
  Plus,
  Edit,
  Trash2,
  Trophy,
  Award,
  Activity,
  BarChart3,
  Zap,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Star
} from 'lucide-react';
import { db } from '@/lib/firebase/config';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query,
  orderBy,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { createListener } from '@/lib/firebase/listener-utils';

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  date: string;
  time: string;
  venue: string;
  league: string;
  season: string;
  status: 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled';
  matchType: 'friendly' | 'league' | 'cup' | 'tournament';
  referee?: string;
  notes?: string;
  attendance?: number;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  playerStats?: PlayerStats[];
  events?: MatchEvent[];
  statistics?: MatchStatistics;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface MatchStatistics {
  homeStats: TeamStats;
  awayStats: TeamStats;
}

interface TeamStats {
  shots: number;
  shotsOnTarget: number;
  possession: number;
  corners: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  offsides: number;
}

interface MatchEvent {
  id: string;
  type: 'field_goal' | 'three_pointer' | 'free_throw' | 'assist' | 'rebound' | 'steal' | 'block' | 'turnover' | 'foul' | 'technical_foul' | 'substitution' | 'timeout';
  team: 'home' | 'away';
  playerId: string;
  playerName: string;
  minute: number;
  period: number;
  description?: string;
}

interface PlayerStats {
  playerId: string;
  playerName: string;
  team: 'home' | 'away';
  position: string;
  minutesPlayed: number;
  points: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  threePointersMade: number;
  threePointersAttempted: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  rebounds: number;
  offensiveRebounds: number;
  defensiveRebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  technicalFouls: number;
  flagrantFouls: number;
  rating: number;
}

interface Student {
  id: string;
  fullName: string;
  branchId: string;
  groupId: string;
  branchName?: string;
  groupName?: string;
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showPlayerStatsModal, setShowPlayerStatsModal] = useState(false);
  const [showEventsModal, setShowEventsModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentView, setCurrentView] = useState<'grid' | 'list' | 'calendar'>('grid');
  
  // Player stats states
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
  
  // Form states for player stats
  const [newPlayerStat, setNewPlayerStat] = useState<Partial<PlayerStats>>({
    team: 'home',
    position: 'guard',
    minutesPlayed: 32,
    points: 0,
    fieldGoalsMade: 0,
    fieldGoalsAttempted: 0,
    threePointersMade: 0,
    threePointersAttempted: 0,
    freeThrowsMade: 0,
    freeThrowsAttempted: 0,
    rebounds: 0,
    offensiveRebounds: 0,
    defensiveRebounds: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
    turnovers: 0,
    fouls: 0,
    technicalFouls: 0,
    flagrantFouls: 0,
    rating: 6.0
  });
  
  // Form states for match events
  const [newEvent, setNewEvent] = useState<Partial<MatchEvent>>({
    type: 'field_goal',
    team: 'home',
    minute: 1,
    period: 1
  });

  const [formData, setFormData] = useState({
    homeTeam: '',
    awayTeam: '',
    homeScore: '',
    awayScore: '',
    date: '',
    time: '',
    venue: '',
    league: '',
    season: '2024-25',
    status: 'scheduled' as Match['status'],
    matchType: 'league' as Match['matchType'],
    referee: '',
    notes: '',
    attendance: ''
  });

  useEffect(() => {
    const unsubscribe = createListener(
      query(collection(db, 'matches'), orderBy('date', 'desc')),
      (snapshot) => {
        const matchesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Match));
        setMatches(matchesData);
        setLoading(false);
      }
    );

    // Fetch students for player selection
    const fetchStudents = async () => {
      try {
        const studentsSnapshot = await getDocs(collection(db, 'students'));
        const studentsData = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Student));
        setStudents(studentsData);
      } catch (error) {
        console.error('Error fetching students:', error);
      }
    };

    fetchStudents();
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const matchData: Partial<Match> = {
        homeTeam: formData.homeTeam,
        awayTeam: formData.awayTeam,
        date: formData.date,
        time: formData.time,
        venue: formData.venue,
        league: formData.league,
        season: formData.season,
        status: formData.status,
        matchType: formData.matchType,
        updatedAt: Timestamp.now()
      };

      // Sadece değer varsa ekle (undefined değerleri Firebase'a gönderme)
      if (formData.homeScore && formData.homeScore.trim() !== '') {
        matchData.homeScore = parseInt(formData.homeScore);
      }
      
      if (formData.awayScore && formData.awayScore.trim() !== '') {
        matchData.awayScore = parseInt(formData.awayScore);
      }
      
      if (formData.referee && formData.referee.trim() !== '') {
        matchData.referee = formData.referee;
      }
      
      if (formData.notes && formData.notes.trim() !== '') {
        matchData.notes = formData.notes;
      }
      
      if (formData.attendance && formData.attendance.trim() !== '') {
        matchData.attendance = parseInt(formData.attendance);
      }

      // Add player stats and events if they exist
      if (playerStats.length > 0) {
        matchData.playerStats = playerStats;
      }
      
      if (matchEvents.length > 0) {
        matchData.events = matchEvents;
      }

      if (editingMatch) {
        await updateDoc(doc(db, 'matches', editingMatch.id), matchData);
      } else {
        await addDoc(collection(db, 'matches'), {
          ...matchData,
          createdAt: Timestamp.now()
        });
      }

      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving match:', error);
    }
  };

  // Player stats management functions
  const addPlayerStat = () => {
    if (!newPlayerStat.playerId || !newPlayerStat.playerName) {
      alert('Lütfen bir oyuncu seçin');
      return;
    }

    const stat: PlayerStats = {
      playerId: newPlayerStat.playerId!,
      playerName: newPlayerStat.playerName!,
      team: newPlayerStat.team!,
      position: newPlayerStat.position!,
      minutesPlayed: newPlayerStat.minutesPlayed || 0,
      points: newPlayerStat.points || 0,
      fieldGoalsMade: newPlayerStat.fieldGoalsMade || 0,
      fieldGoalsAttempted: newPlayerStat.fieldGoalsAttempted || 0,
      threePointersMade: newPlayerStat.threePointersMade || 0,
      threePointersAttempted: newPlayerStat.threePointersAttempted || 0,
      freeThrowsMade: newPlayerStat.freeThrowsMade || 0,
      freeThrowsAttempted: newPlayerStat.freeThrowsAttempted || 0,
      rebounds: newPlayerStat.rebounds || 0,
      offensiveRebounds: newPlayerStat.offensiveRebounds || 0,
      defensiveRebounds: newPlayerStat.defensiveRebounds || 0,
      assists: newPlayerStat.assists || 0,
      steals: newPlayerStat.steals || 0,
      blocks: newPlayerStat.blocks || 0,
      turnovers: newPlayerStat.turnovers || 0,
      fouls: newPlayerStat.fouls || 0,
      technicalFouls: newPlayerStat.technicalFouls || 0,
      flagrantFouls: newPlayerStat.flagrantFouls || 0,
      rating: newPlayerStat.rating || 6.0
    };

    setPlayerStats([...playerStats, stat]);
    
    // Reset form
    setNewPlayerStat({
      team: 'home',
      position: 'guard',
      minutesPlayed: 32,
      points: 0,
      fieldGoalsMade: 0,
      fieldGoalsAttempted: 0,
      threePointersMade: 0,
      threePointersAttempted: 0,
      freeThrowsMade: 0,
      freeThrowsAttempted: 0,
      rebounds: 0,
      offensiveRebounds: 0,
      defensiveRebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      turnovers: 0,
      fouls: 0,
      technicalFouls: 0,
      flagrantFouls: 0,
      rating: 6.0
    });
  };

  const removePlayerStat = (index: number) => {
    setPlayerStats(playerStats.filter((_, i) => i !== index));
  };

  // Match events management functions
  const addMatchEvent = () => {
    if (!newEvent.playerId || !newEvent.playerName) {
      alert('Lütfen bir oyuncu seçin');
      return;
    }

    const event: MatchEvent = {
      id: Date.now().toString(),
      type: newEvent.type!,
      team: newEvent.team!,
      playerId: newEvent.playerId!,
      playerName: newEvent.playerName!,
      minute: newEvent.minute || 1,
      period: newEvent.period || 1,
      description: newEvent.description || ''
    };

    setMatchEvents([...matchEvents, event]);
    
    // Reset form
    setNewEvent({
      type: 'field_goal',
      team: 'home',
      minute: 1,
      period: 1
    });
  };

  const removeMatchEvent = (eventId: string) => {
    setMatchEvents(matchEvents.filter(event => event.id !== eventId));
  };

  const getEventIcon = (type: MatchEvent['type']) => {
    switch (type) {
      case 'field_goal': return '🏀';
      case 'three_pointer': return '🎯';
      case 'free_throw': return '🆓';
      case 'assist': return '🅰️';
      case 'rebound': return '↩️';
      case 'steal': return '🤏';
      case 'block': return '🚫';
      case 'turnover': return '❌';
      case 'foul': return '⚠️';
      case 'technical_foul': return '🟨';
      case 'substitution': return '🔄';
      case 'timeout': return '⏰';
      default: return '📝';
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bu maçı silmek istediğinizden emin misiniz?')) {
      try {
        await deleteDoc(doc(db, 'matches', id));
      } catch (error) {
        console.error('Error deleting match:', error);
      }
    }
  };

  const handleEdit = (match: Match) => {
    setEditingMatch(match);
    setFormData({
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeScore: match.homeScore?.toString() || '',
      awayScore: match.awayScore?.toString() || '',
      date: match.date,
      time: match.time,
      venue: match.venue,
      league: match.league,
      season: match.season,
      status: match.status,
      matchType: match.matchType,
      referee: match.referee || '',
      notes: match.notes || '',
      attendance: match.attendance?.toString() || ''
    });
    
    // Load existing player stats and events if available
    if (match.statistics?.homeStats || match.statistics?.awayStats) {
      // You can load team stats here if needed
    }
    
    // Load player stats if available
    if (match.playerStats) {
      setPlayerStats(match.playerStats);
    } else {
      setPlayerStats([]);
    }
    
    // Load match events if available
    if (match.events) {
      setMatchEvents(match.events);
    } else {
      setMatchEvents([]);
    }
    
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      homeTeam: '',
      awayTeam: '',
      homeScore: '',
      awayScore: '',
      date: '',
      time: '',
      venue: '',
      league: '',
      season: '2024-25',
      status: 'scheduled',
      matchType: 'league',
      referee: '',
      notes: '',
      attendance: ''
    });
    setEditingMatch(null);
    setPlayerStats([]);
    setMatchEvents([]);
    
    // Reset player stat form
    setNewPlayerStat({
      team: 'home',
      position: 'guard',
      minutesPlayed: 32,
      points: 0,
      fieldGoalsMade: 0,
      fieldGoalsAttempted: 0,
      threePointersMade: 0,
      threePointersAttempted: 0,
      freeThrowsMade: 0,
      freeThrowsAttempted: 0,
      rebounds: 0,
      offensiveRebounds: 0,
      defensiveRebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      turnovers: 0,
      fouls: 0,
      technicalFouls: 0,
      flagrantFouls: 0,
      rating: 6.0
    });
    
    // Reset event form
    setNewEvent({
      type: 'field_goal',
      team: 'home',
      minute: 1,
      period: 1
    });
  };

  const getStatusColor = (status: Match['status']) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'live': return 'bg-green-100 text-green-800 animate-pulse';
      case 'finished': return 'bg-gray-100 text-gray-800';
      case 'postponed': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: Match['status']) => {
    switch (status) {
      case 'scheduled': return <Clock className="h-4 w-4" />;
      case 'live': return <Zap className="h-4 w-4" />;
      case 'finished': return <CheckCircle2 className="h-4 w-4" />;
      case 'postponed': return <AlertCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getMatchTypeIcon = (type: Match['matchType']) => {
    switch (type) {
      case 'league': return <Trophy className="h-4 w-4" />;
      case 'cup': return <Award className="h-4 w-4" />;
      case 'tournament': return <Star className="h-4 w-4" />;
      case 'friendly': return <Activity className="h-4 w-4" />;
      default: return <Trophy className="h-4 w-4" />;
    }
  };

  const filteredMatches = matches.filter(match => {
    const matchesSearch = match.homeTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         match.awayTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         match.league.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         match.venue.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || match.status === statusFilter;
    const matchesType = typeFilter === 'all' || match.matchType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // İstatistikler
  const stats = {
    totalMatches: matches.length,
    upcomingMatches: matches.filter(m => m.status === 'scheduled').length,
    liveMatches: matches.filter(m => m.status === 'live').length,
    finishedMatches: matches.filter(m => m.status === 'finished').length,
    wins: matches.filter(m => m.status === 'finished' && m.homeScore !== undefined && m.awayScore !== undefined && m.homeScore > m.awayScore).length,
    draws: matches.filter(m => m.status === 'finished' && m.homeScore !== undefined && m.awayScore !== undefined && m.homeScore === m.awayScore).length,
    losses: matches.filter(m => m.status === 'finished' && m.homeScore !== undefined && m.awayScore !== undefined && m.homeScore < m.awayScore).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              Maç Takvimi
            </h1>
            <p className="text-gray-600 mt-2">Tüm maçları yönetin, sonuçları takip edin ve istatistikleri görüntüleyin</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Yeni Maç Ekle
          </button>
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <span className="text-sm text-blue-600 font-medium">Toplam</span>
          </div>
          <h3 className="text-3xl font-bold text-blue-900 mb-1">{stats.totalMatches}</h3>
          <p className="text-blue-700 text-sm">Toplam Maç</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <span className="text-sm text-green-600 font-medium">Canlı</span>
          </div>
          <h3 className="text-3xl font-bold text-green-900 mb-1">{stats.liveMatches}</h3>
          <p className="text-green-700 text-sm">Devam Eden</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <span className="text-sm text-purple-600 font-medium">Yaklaşan</span>
          </div>
          <h3 className="text-3xl font-bold text-purple-900 mb-1">{stats.upcomingMatches}</h3>
          <p className="text-purple-700 text-sm">Planlanmış</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <span className="text-sm text-orange-600 font-medium">Galibiyet</span>
          </div>
          <h3 className="text-3xl font-bold text-orange-900 mb-1">{stats.wins}</h3>
          <p className="text-orange-700 text-sm">Kazanılan</p>
        </div>
      </div>

      {/* Filtreler ve Görünüm */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Arama */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Takım, lig veya mekan ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtreler */}
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="scheduled">Planlanmış</option>
              <option value="live">Canlı</option>
              <option value="finished">Biten</option>
              <option value="postponed">Ertelenen</option>
              <option value="cancelled">İptal</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tüm Tipler</option>
              <option value="league">Lig</option>
              <option value="cup">Kupa</option>
              <option value="tournament">Turnuva</option>
              <option value="friendly">Hazırlık</option>
            </select>
          </div>

          {/* Görünüm Seçici */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setCurrentView('grid')}
              className={`px-3 py-1 rounded-md transition-colors ${
                currentView === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setCurrentView('list')}
              className={`px-3 py-1 rounded-md transition-colors ${
                currentView === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
              }`}
            >
              Liste
            </button>
          </div>
        </div>
      </div>

      {/* Maç Listesi - Grid Görünüm */}
      {currentView === 'grid' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredMatches.map((match) => (
            <div key={match.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden">
              {/* Maç Header */}
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {getMatchTypeIcon(match.matchType)}
                    <span className="text-sm font-medium text-gray-600">{match.league}</span>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(match.status)}`}>
                    {getStatusIcon(match.status)}
                    {match.status === 'scheduled' && 'Planlandı'}
                    {match.status === 'live' && 'Canlı'}
                    {match.status === 'finished' && 'Bitti'}
                    {match.status === 'postponed' && 'Ertelendi'}
                    {match.status === 'cancelled' && 'İptal'}
                  </div>
                </div>

                {/* Takımlar ve Skor */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1 text-center">
                    <h3 className="font-bold text-lg text-gray-900 mb-1">{match.homeTeam}</h3>
                    <span className="text-sm text-gray-500">Ev Sahibi</span>
                  </div>
                  
                  <div className="flex items-center gap-4 mx-6">
                    {match.status === 'finished' || match.status === 'live' ? (
                      <div className="text-center">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl font-bold text-gray-900">{match.homeScore || 0}</span>
                          <span className="text-2xl font-bold text-gray-400">-</span>
                          <span className="text-3xl font-bold text-gray-900">{match.awayScore || 0}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-400">VS</div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 text-center">
                    <h3 className="font-bold text-lg text-gray-900 mb-1">{match.awayTeam}</h3>
                    <span className="text-sm text-gray-500">Deplasman</span>
                  </div>
                </div>

                {/* Maç Detayları */}
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(match.date).toLocaleDateString('tr-TR')}</span>
                    <Clock className="h-4 w-4 ml-2" />
                    <span>{match.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{match.venue}</span>
                  </div>
                  {match.referee && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Hakem: {match.referee}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Aksiyonlar */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      setSelectedMatch(match);
                      setShowStatsModal(true);
                    }}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm"
                  >
                    <BarChart3 className="h-4 w-4" />
                    İstatistikler
                  </button>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(match)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(match.id)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Maç Listesi - Liste Görünümü */}
      {currentView === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Maç</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih & Saat</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mekan</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lig</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skor</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMatches.map((match) => (
                  <tr key={match.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {getMatchTypeIcon(match.matchType)}
                        <div>
                          <p className="font-medium text-gray-900">{match.homeTeam} vs {match.awayTeam}</p>
                          <p className="text-sm text-gray-500">{match.matchType}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="text-gray-900">{new Date(match.date).toLocaleDateString('tr-TR')}</p>
                        <p className="text-gray-500">{match.time}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{match.venue}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{match.league}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(match.status)}`}>
                        {getStatusIcon(match.status)}
                        {match.status === 'scheduled' && 'Planlandı'}
                        {match.status === 'live' && 'Canlı'}
                        {match.status === 'finished' && 'Bitti'}
                        {match.status === 'postponed' && 'Ertelendi'}
                        {match.status === 'cancelled' && 'İptal'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {match.status === 'finished' || match.status === 'live' ? (
                        <span className="font-mono font-bold text-lg">
                          {match.homeScore || 0} - {match.awayScore || 0}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedMatch(match);
                            setShowStatsModal(true);
                          }}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(match)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(match.id)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Maç Ekleme/Düzenleme Modalı */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900">
                {editingMatch ? 'Maçı Düzenle' : 'Yeni Maç Ekle'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Ev Sahibi Takım */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ev Sahibi Takım *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.homeTeam}
                    onChange={(e) => setFormData({ ...formData, homeTeam: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Takım adı"
                  />
                </div>

                {/* Deplasman Takımı */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deplasman Takımı *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.awayTeam}
                    onChange={(e) => setFormData({ ...formData, awayTeam: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Takım adı"
                  />
                </div>

                {/* Ev Sahibi Skor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ev Sahibi Skor
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.homeScore}
                    onChange={(e) => setFormData({ ...formData, homeScore: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>

                {/* Deplasman Skor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deplasman Skor
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.awayScore}
                    onChange={(e) => setFormData({ ...formData, awayScore: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>

                {/* Tarih */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tarih *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Saat */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Saat *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Mekan */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mekan *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Stadyum/Salon adı"
                  />
                </div>

                {/* Lig */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lig/Müsabaka *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.league}
                    onChange={(e) => setFormData({ ...formData, league: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Lig adı"
                  />
                </div>

                {/* Sezon */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sezon
                  </label>
                  <input
                    type="text"
                    value={formData.season}
                    onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="2024-25"
                  />
                </div>

                {/* Durum */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Durum
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Match['status'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="scheduled">Planlandı</option>
                    <option value="live">Canlı</option>
                    <option value="finished">Bitti</option>
                    <option value="postponed">Ertelendi</option>
                    <option value="cancelled">İptal Edildi</option>
                  </select>
                </div>

                {/* Maç Tipi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maç Tipi
                  </label>
                  <select
                    value={formData.matchType}
                    onChange={(e) => setFormData({ ...formData, matchType: e.target.value as Match['matchType'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="league">Lig Maçı</option>
                    <option value="cup">Kupa Maçı</option>
                    <option value="tournament">Turnuva</option>
                    <option value="friendly">Hazırlık Maçı</option>
                  </select>
                </div>

                {/* Hakem */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hakem
                  </label>
                  <input
                    type="text"
                    value={formData.referee}
                    onChange={(e) => setFormData({ ...formData, referee: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Hakem adı"
                  />
                </div>

                {/* Seyirci Sayısı */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seyirci Sayısı
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.attendance}
                    onChange={(e) => setFormData({ ...formData, attendance: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Notlar */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notlar
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Maç hakkında notlar..."
                />
              </div>

              {/* Oyuncu İstatistikleri ve Olaylar Sekmesi */}
              <div className="mt-8 border-t border-gray-200 pt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Detaylı İstatistikler ve Olaylar</h4>
                
                {/* Sekme Butonları */}
                <div className="flex gap-3 mb-6">
                  <button
                    type="button"
                    onClick={() => setShowPlayerStatsModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Users className="h-4 w-4" />
                    Oyuncu İstatistikleri ({playerStats.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEventsModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <Activity className="h-4 w-4" />
                    Maç Olayları ({matchEvents.length})
                  </button>
                </div>

                {/* Özet Görünüm */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Oyuncu İstatistikleri Özet */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-2">Kayıtlı Oyuncular</h5>
                    {playerStats.length > 0 ? (
                      <div className="space-y-1">
                        {playerStats.slice(0, 3).map((stat, index) => (
                          <div key={index} className="text-sm text-gray-600">
                            {stat.playerName} - {stat.team === 'home' ? formData.homeTeam : formData.awayTeam}
                          </div>
                        ))}
                        {playerStats.length > 3 && (
                          <div className="text-sm text-gray-500">+{playerStats.length - 3} diğer oyuncu</div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Henüz oyuncu istatistiği eklenmedi</p>
                    )}
                  </div>

                  {/* Maç Olayları Özet */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-2">Son Olaylar</h5>
                    {matchEvents.length > 0 ? (
                      <div className="space-y-1">
                        {matchEvents.slice(-3).map((event, index) => (
                          <div key={index} className="text-sm text-gray-600">
                            {event.minute}&apos; {getEventIcon(event.type)} {event.playerName}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Henüz maç olayı eklenmedi</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Butonlar */}
              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300"
                >
                  {editingMatch ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* İstatistikler Modalı */}
      {showStatsModal && selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">
                  Maç İstatistikleri
                </h3>
                <button
                  onClick={() => setShowStatsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              <div className="mt-2">
                <p className="text-lg font-semibold">
                  {selectedMatch.homeTeam} vs {selectedMatch.awayTeam}
                </p>
                <p className="text-gray-600">
                  {new Date(selectedMatch.date).toLocaleDateString('tr-TR')} - {selectedMatch.time}
                </p>
              </div>
            </div>
            
            <div className="p-6">
              {/* Skor */}
              {(selectedMatch.status === 'finished' || selectedMatch.status === 'live') && (
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center gap-8">
                    <div className="text-center">
                      <h4 className="font-bold text-xl mb-2">{selectedMatch.homeTeam}</h4>
                      <div className="text-6xl font-bold text-blue-600">{selectedMatch.homeScore || 0}</div>
                    </div>
                    <div className="text-4xl font-bold text-gray-400">-</div>
                    <div className="text-center">
                      <h4 className="font-bold text-xl mb-2">{selectedMatch.awayTeam}</h4>
                      <div className="text-6xl font-bold text-purple-600">{selectedMatch.awayScore || 0}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Maç Bilgileri */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-5 w-5 text-gray-600" />
                    <span className="font-medium text-gray-900">Tarih & Saat</span>
                  </div>
                  <p className="text-gray-700">
                    {new Date(selectedMatch.date).toLocaleDateString('tr-TR')} - {selectedMatch.time}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-5 w-5 text-gray-600" />
                    <span className="font-medium text-gray-900">Mekan</span>
                  </div>
                  <p className="text-gray-700">{selectedMatch.venue}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="h-5 w-5 text-gray-600" />
                    <span className="font-medium text-gray-900">Lig</span>
                  </div>
                  <p className="text-gray-700">{selectedMatch.league}</p>
                </div>

                {selectedMatch.referee && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-gray-600" />
                      <span className="font-medium text-gray-900">Hakem</span>
                    </div>
                    <p className="text-gray-700">{selectedMatch.referee}</p>
                  </div>
                )}

                {selectedMatch.attendance && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-gray-600" />
                      <span className="font-medium text-gray-900">Seyirci</span>
                    </div>
                    <p className="text-gray-700">{selectedMatch.attendance.toLocaleString()}</p>
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-5 w-5 text-gray-600" />
                    <span className="font-medium text-gray-900">Durum</span>
                  </div>
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedMatch.status)}`}>
                    {getStatusIcon(selectedMatch.status)}
                    {selectedMatch.status === 'scheduled' && 'Planlandı'}
                    {selectedMatch.status === 'live' && 'Canlı'}
                    {selectedMatch.status === 'finished' && 'Bitti'}
                    {selectedMatch.status === 'postponed' && 'Ertelendi'}
                    {selectedMatch.status === 'cancelled' && 'İptal'}
                  </div>
                </div>
              </div>

              {/* Notlar */}
              {selectedMatch.notes && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Notlar</h4>
                  <p className="text-blue-800">{selectedMatch.notes}</p>
                </div>
              )}

              {/* Player Stats Display */}
              {selectedMatch && selectedMatch.playerStats && (
                <div className="mt-8">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Oyuncu İstatistikleri</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Home Team Players */}
                    <div>
                      <h5 className="font-medium text-blue-600 mb-3">{selectedMatch.homeTeam}</h5>
                      <div className="space-y-2">
                        {(selectedMatch.playerStats || [])
                          .filter((stat: PlayerStats) => stat.team === 'home')
                          .map((stat: PlayerStats, index: number) => (
                            <div key={index} className="bg-blue-50 p-3 rounded-lg">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-blue-900">{stat.playerName}</p>
                                  <p className="text-sm text-blue-700">{stat.position}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-blue-600">{stat.rating}/10</p>
                                  <p className="text-xs text-blue-600">{stat.minutesPlayed}&apos;</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-blue-700">
                                <div>🏀 {stat.points} PTS</div>
                                <div>🅰️ {stat.assists} AST</div>
                                <div>↩️ {stat.rebounds} REB</div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Away Team Players */}
                    <div>
                      <h5 className="font-medium text-purple-600 mb-3">{selectedMatch.awayTeam}</h5>
                      <div className="space-y-2">
                        {(selectedMatch.playerStats || [])
                          .filter((stat: PlayerStats) => stat.team === 'away')
                          .map((stat: PlayerStats, index: number) => (
                            <div key={index} className="bg-purple-50 p-3 rounded-lg">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-purple-900">{stat.playerName}</p>
                                  <p className="text-sm text-purple-700">{stat.position}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-purple-600">{stat.rating}/10</p>
                                  <p className="text-xs text-purple-600">{stat.minutesPlayed}&apos;</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-purple-700">
                                <div>🏀 {stat.points} PTS</div>
                                <div>🅰️ {stat.assists} AST</div>
                                <div>↩️ {stat.rebounds} REB</div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Match Events Display */}
              {selectedMatch && selectedMatch.events && selectedMatch.events.length > 0 && (
                <div className="mt-8">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Maç Olayları</h4>
                  <div className="space-y-2">
                    {selectedMatch.events
                      .sort((a, b) => a.minute - b.minute)
                      .map((event, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center font-bold text-gray-700">
                            {event.minute}&apos;
                          </div>
                          <div className="text-2xl">{getEventIcon(event.type)}</div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{event.playerName}</p>
                            <p className="text-sm text-gray-600">
                              {event.team === 'home' ? selectedMatch.homeTeam : selectedMatch.awayTeam}
                              {event.description && ` - ${event.description}`}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Oyuncu İstatistikleri Modalı */}
      {showPlayerStatsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">Oyuncu İstatistikleri</h3>
                <button
                  onClick={() => setShowPlayerStatsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Yeni Oyuncu Ekleme Formu */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h4 className="text-lg font-semibold text-blue-900 mb-4">Yeni Oyuncu İstatistiği Ekle</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Oyuncu Seçimi */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Oyuncu *</label>
                    <select
                      value={newPlayerStat.playerId || ''}
                      onChange={(e) => {
                        const student = students.find(s => s.id === e.target.value);
                        setNewPlayerStat({
                          ...newPlayerStat,
                          playerId: e.target.value,
                          playerName: student?.fullName || ''
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Oyuncu seçin...</option>
                      {students.map(student => (
                        <option key={student.id} value={student.id}>
                          {student.fullName} {student.branchName && `(${student.branchName})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Takım */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Takım</label>
                    <select
                      value={newPlayerStat.team}
                      onChange={(e) => setNewPlayerStat({ ...newPlayerStat, team: e.target.value as 'home' | 'away' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="home">{formData.homeTeam || 'Ev Sahibi'}</option>
                      <option value="away">{formData.awayTeam || 'Deplasman'}</option>
                    </select>
                  </div>

                  {/* Pozisyon */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pozisyon</label>
                    <select
                      value={newPlayerStat.position}
                      onChange={(e) => setNewPlayerStat({ ...newPlayerStat, position: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="point_guard">Oyun Kurucu (PG)</option>
                      <option value="shooting_guard">Şutör Guard (SG)</option>
                      <option value="small_forward">Küçük Forvet (SF)</option>
                      <option value="power_forward">Güçlü Forvet (PF)</option>
                      <option value="center">Pivot (C)</option>
                    </select>
                  </div>

                  {/* Oynadığı Dakika */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Oynadığı Dakika</label>
                    <input
                      type="number"
                      min="0"
                      max="48"
                      value={newPlayerStat.minutesPlayed}
                      onChange={(e) => setNewPlayerStat({ ...newPlayerStat, minutesPlayed: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Sayı */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Toplam Sayı</label>
                    <input
                      type="number"
                      min="0"
                      value={newPlayerStat.points}
                      onChange={(e) => setNewPlayerStat({ ...newPlayerStat, points: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Saha Şutu İsabetli */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Saha Şutu İsabetli</label>
                    <input
                      type="number"
                      min="0"
                      value={newPlayerStat.fieldGoalsMade}
                      onChange={(e) => setNewPlayerStat({ ...newPlayerStat, fieldGoalsMade: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Saha Şutu Deneme */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Saha Şutu Deneme</label>
                    <input
                      type="number"
                      min="0"
                      value={newPlayerStat.fieldGoalsAttempted}
                      onChange={(e) => setNewPlayerStat({ ...newPlayerStat, fieldGoalsAttempted: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* 3 Sayılık İsabetli */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">3 Sayılık İsabetli</label>
                    <input
                      type="number"
                      min="0"
                      value={newPlayerStat.threePointersMade}
                      onChange={(e) => setNewPlayerStat({ ...newPlayerStat, threePointersMade: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* 3 Sayılık Deneme */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">3 Sayılık Deneme</label>
                    <input
                      type="number"
                      min="0"
                      value={newPlayerStat.threePointersAttempted}
                      onChange={(e) => setNewPlayerStat({ ...newPlayerStat, threePointersAttempted: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Serbest Atış İsabetli */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Serbest Atış İsabetli</label>
                    <input
                      type="number"
                      min="0"
                      value={newPlayerStat.freeThrowsMade}
                      onChange={(e) => setNewPlayerStat({ ...newPlayerStat, freeThrowsMade: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Serbest Atış Deneme */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Serbest Atış Deneme</label>
                    <input
                      type="number"
                      min="0"
                      value={newPlayerStat.freeThrowsAttempted}
                      onChange={(e) => setNewPlayerStat({ ...newPlayerStat, freeThrowsAttempted: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Toplam Ribaund */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Toplam Ribaund</label>
                    <input
                      type="number"
                      min="0"
                      value={newPlayerStat.rebounds}
                      onChange={(e) => setNewPlayerStat({ ...newPlayerStat, rebounds: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Hücum Ribaundu */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hücum Ribaundu</label>
                    <input
                      type="number"
                      min="0"
                      value={newPlayerStat.offensiveRebounds}
                      onChange={(e) => setNewPlayerStat({ ...newPlayerStat, offensiveRebounds: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Savunma Ribaundu */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Savunma Ribaundu</label>
                    <input
                      type="number"
                      min="0"
                      value={newPlayerStat.defensiveRebounds}
                      onChange={(e) => setNewPlayerStat({ ...newPlayerStat, defensiveRebounds: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Asist */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Asist</label>
                    <input
                      type="number"
                      min="0"
                      value={newPlayerStat.assists}
                      onChange={(e) => setNewPlayerStat({ ...newPlayerStat, assists: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Top Çalma */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Top Çalma</label>
                    <input
                      type="number"
                      min="0"
                      value={newPlayerStat.steals}
                      onChange={(e) => setNewPlayerStat({ ...newPlayerStat, steals: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Blok */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Blok</label>
                    <input
                      type="number"
                      min="0"
                      value={newPlayerStat.blocks}
                      onChange={(e) => setNewPlayerStat({ ...newPlayerStat, blocks: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Top Kaybı */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Top Kaybı</label>
                    <input
                      type="number"
                      min="0"
                      value={newPlayerStat.turnovers}
                      onChange={(e) => setNewPlayerStat({ ...newPlayerStat, turnovers: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Faul */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kişisel Faul</label>
                    <input
                      type="number"
                      min="0"
                      max="6"
                      value={newPlayerStat.fouls}
                      onChange={(e) => setNewPlayerStat({ ...newPlayerStat, fouls: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Teknik Faul */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Teknik Faul</label>
                    <input
                      type="number"
                      min="0"
                      max="2"
                      value={newPlayerStat.technicalFouls}
                      onChange={(e) => setNewPlayerStat({ ...newPlayerStat, technicalFouls: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Flagrant Faul */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Flagrant Faul</label>
                    <input
                      type="number"
                      min="0"
                      max="2"
                      value={newPlayerStat.flagrantFouls}
                      onChange={(e) => setNewPlayerStat({ ...newPlayerStat, flagrantFouls: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Puan */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Puan (1-10)</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      step="0.1"
                      value={newPlayerStat.rating}
                      onChange={(e) => setNewPlayerStat({ ...newPlayerStat, rating: parseFloat(e.target.value) || 6.0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <button
                    onClick={addPlayerStat}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Oyuncu Ekle
                  </button>
                </div>
              </div>

              {/* Mevcut Oyuncu İstatistikleri */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Kayıtlı Oyuncular ({playerStats.length})</h4>
                
                {playerStats.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Henüz oyuncu istatistiği eklenmedi</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {playerStats.map((stat, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h5 className="font-medium text-gray-900">{stat.playerName}</h5>
                            <p className="text-sm text-gray-600">
                              {stat.team === 'home' ? formData.homeTeam : formData.awayTeam} - {stat.position}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                              {stat.rating}/10
                            </span>
                            <button
                              onClick={() => removePlayerStat(index)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
                          <div className="text-center">
                            <p className="text-gray-500">Dakika</p>
                            <p className="font-medium">{stat.minutesPlayed}&apos;</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-500">Sayı</p>
                            <p className="font-medium">🏀 {stat.points} PTS</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-500">Saha Şutu</p>
                            <p className="font-medium">🎯 {stat.fieldGoalsMade}/{stat.fieldGoalsAttempted}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-500">3 Sayı</p>
                            <p className="font-medium">🎯 {stat.threePointersMade}/{stat.threePointersAttempted}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-500">Ribaund</p>
                            <p className="font-medium">↩️ {stat.rebounds}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-500">Asist</p>
                            <p className="font-medium">🅰️ {stat.assists}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-500">Top Çalma</p>
                            <p className="font-medium">🤏 {stat.steals}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-500">Blok</p>
                            <p className="font-medium">🚫 {stat.blocks}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-500">Faul</p>
                            <p className="font-medium">⚠️ {stat.fouls}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Maç Olayları Modalı */}
      {showEventsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">Maç Olayları</h3>
                <button
                  onClick={() => setShowEventsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Yeni Olay Ekleme Formu */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <h4 className="text-lg font-semibold text-green-900 mb-4">Yeni Olay Ekle</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Olay Tipi */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Olay Tipi *</label>
                    <select
                      value={newEvent.type}
                      onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as MatchEvent['type'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="field_goal">🏀 Saha Şutu</option>
                      <option value="three_pointer">🎯 3 Sayılık</option>
                      <option value="free_throw">🆓 Serbest Atış</option>
                      <option value="assist">🅰️ Asist</option>
                      <option value="rebound">↩️ Ribaund</option>
                      <option value="steal">🤏 Top Çalma</option>
                      <option value="block">🚫 Blok</option>
                      <option value="turnover">❌ Top Kaybı</option>
                      <option value="foul">⚠️ Kişisel Faul</option>
                      <option value="technical_foul">🟨 Teknik Faul</option>
                      <option value="substitution">🔄 Oyuncu Değişikliği</option>
                      <option value="timeout">⏰ Mola</option>
                    </select>
                  </div>

                  {/* Periyot */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Periyot *</label>
                    <select
                      value={newEvent.period}
                      onChange={(e) => setNewEvent({ ...newEvent, period: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value={1}>1. Periyot</option>
                      <option value={2}>2. Periyot</option>
                      <option value={3}>3. Periyot</option>
                      <option value={4}>4. Periyot</option>
                      <option value={5}>Uzatma 1</option>
                      <option value={6}>Uzatma 2</option>
                    </select>
                  </div>

                  {/* Dakika */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Dakika *</label>
                    <input
                      type="number"
                      min="0"
                      max="12"
                      value={newEvent.minute}
                      onChange={(e) => setNewEvent({ ...newEvent, minute: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Periyot içindeki dakika (0-12)"
                    />
                  </div>

                  {/* Oyuncu */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Oyuncu *</label>
                    <select
                      value={newEvent.playerId || ''}
                      onChange={(e) => {
                        const student = students.find(s => s.id === e.target.value);
                        setNewEvent({
                          ...newEvent,
                          playerId: e.target.value,
                          playerName: student?.fullName || ''
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Oyuncu seçin...</option>
                      {students.map(student => (
                        <option key={student.id} value={student.id}>
                          {student.fullName} {student.branchName && `(${student.branchName})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Takım */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Takım</label>
                    <select
                      value={newEvent.team}
                      onChange={(e) => setNewEvent({ ...newEvent, team: e.target.value as 'home' | 'away' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="home">{formData.homeTeam || 'Ev Sahibi'}</option>
                      <option value="away">{formData.awayTeam || 'Deplasman'}</option>
                    </select>
                  </div>

                  {/* Açıklama */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
                    <input
                      type="text"
                      value={newEvent.description || ''}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Ek açıklama (isteğe bağlı)"
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <button
                    onClick={addMatchEvent}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Olay Ekle
                  </button>
                </div>
              </div>

              {/* Mevcut Olaylar */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Maç Olayları ({matchEvents.length})</h4>
                
                {matchEvents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Henüz maç olayı eklenmedi</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {matchEvents
                      .sort((a, b) => a.minute - b.minute)
                      .map((event, index) => (
                        <div key={event.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                          <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center font-bold text-gray-700">
                            {event.minute}&apos;
                          </div>
                          <div className="text-2xl">{getEventIcon(event.type)}</div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{event.playerName}</p>
                            <p className="text-sm text-gray-600">
                              {event.team === 'home' ? formData.homeTeam : formData.awayTeam}
                              {event.description && ` - ${event.description}`}
                            </p>
                          </div>
                          <button
                            onClick={() => removeMatchEvent(event.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}