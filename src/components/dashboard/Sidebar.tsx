'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin, isTrainer, canTakeAttendance } from '@/lib/firebase/auth';
import { 
  Home,
  Calendar,
  DollarSign,
  Activity,
  Building,
  UsersIcon,
  GraduationCap,
  Dumbbell,
  ClipboardCheck,
  UserCog,
  Bell,
  ShieldUser,
  CalendarClock,
  UsersRound 
} from 'lucide-react';

import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import Diversity3OutlinedIcon from '@mui/icons-material/Diversity3Outlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import SportsOutlinedIcon from '@mui/icons-material/SportsOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import FitnessCenterOutlinedIcon from '@mui/icons-material/FitnessCenterOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';

const menuItems = [
  {
    title: 'Dashboard',
    icon: HomeOutlinedIcon,
    href: '/dashboard'
  },
  {
    title: 'Kullanıcı Yönetimi',
    icon: ManageAccountsOutlinedIcon,
    href: '/dashboard/users'
  },
  {
    title: 'Bildirimler',
    icon: NotificationsOutlinedIcon,
    href: '/dashboard/notifications'
  },
  {
    title: 'Şubeler',
    icon: AccountTreeOutlinedIcon,
    href: '/dashboard/branches'
  },
  {
    title: 'Gruplar',
    icon: Diversity3OutlinedIcon,
    href: '/dashboard/groups'
  },
  {
    title: 'Öğrenciler',
    icon: SchoolOutlinedIcon,
    href: '/dashboard/students'
  },
  {
    title: 'Antrenörler',
    icon: SportsOutlinedIcon,
    href: '/dashboard/trainers'
  },
  {
    title: 'Yoklama Takip',
    icon: FactCheckOutlinedIcon,
    href: '/dashboard/attendance'
  },
  {
    title: 'Çalışanlar',
    icon: BadgeOutlinedIcon,
    href: '/dashboard/employees'
  },
  {
    title: 'Antrenmanlar',
    icon: FitnessCenterOutlinedIcon,
    href: '/dashboard/trainings'
  },
  {
    title: 'Maç Takvimi',
    icon: CalendarMonthOutlinedIcon,
    href: '/dashboard/matches'
  },
  {
    title: 'Etkinlikler',
    icon: EventOutlinedIcon,
    href: '/dashboard/events'
  },
  {
    title: 'Finansal',
    icon: CreditCardOutlinedIcon,
    href: '/dashboard/finance'
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const { userData } = useAuth();

  // Rol bazlı menü filtreleme
  const filteredMenuItems = menuItems.filter(item => {
    // Dashboard herkes görebilir
    if (item.href === '/dashboard') return true;
    
    // Sadece admin görebilir
    if (isAdmin(userData)) return true;
    
    // Antrenör görebileceği sayfalar
    if (isTrainer(userData)) {
      const trainerAllowedPaths = [
        '/dashboard',
        '/dashboard/students',
        '/dashboard/groups',
        '/dashboard/attendance',
        '/dashboard/trainings',
        '/dashboard/notifications'
      ];
      return trainerAllowedPaths.includes(item.href);
    }
    
    // Diğer roller için sadece dashboard
    return false;
  });

  return (
    <div className="w-[280px] bg-white border-r border-gray-200 h-screen flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center transform transition-transform group-hover:scale-110">
            <Activity className="w-7 h-7 text-white" />
            
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Sports Club</h1>
            <p className="text-xs text-gray-500 mt-1">
              {isAdmin(userData) ? 'Admin Paneli' : 
               isTrainer(userData) ? 'Antrenör Paneli' : 
               'Yönetim Paneli'}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-600 hover:bg-blue-50 hover:text-blue-900'
                  }`}
                >
                  <Icon />
                  <span className="text-sm">{item.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}