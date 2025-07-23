'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

const menuItems = [
  {
    title: 'Dashboard',
    icon: Home,
    href: '/dashboard'
  },
  {
    title: 'Kullanıcı Yönetimi',
    icon: UserCog,
    href: '/dashboard/users'
  },
  {
    title: 'Bildirimler',
    icon: Bell,
    href: '/dashboard/notifications'
  },
  {
    title: 'Şubeler',
    icon: Building,
    href: '/dashboard/branches'
  },
  {
    title: 'Gruplar',
    icon: UsersRound,
    href: '/dashboard/groups'
  },
  {
    title: 'Öğrenciler',
    icon: GraduationCap,
    href: '/dashboard/students'
  },
  {
    title: 'Antrenörler',
    icon: ShieldUser,
    href: '/dashboard/trainers'
  },
  {
    title: 'Yoklama Takip',
    icon: ClipboardCheck,
    href: '/dashboard/attendance'
  },
  {
    title: 'Çalışanlar',
    icon: UsersIcon,
    href: '/dashboard/employees'
  },
  {
    title: 'Antrenmanlar',
    icon: Dumbbell,
    href: '/dashboard/trainings'
  },
  {
    title: 'Maç Takvimi',
    icon: Calendar,
    href: '/dashboard/matches'
  },
  {
    title: 'Etkinlikler',
    icon: CalendarClock,
    href: '/dashboard/events'
  },
  {
    title: 'Finansal',
    icon: DollarSign,
    href: '/dashboard/finance'
  }
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-[280px] bg-white border-r border-gray-200 h-screen flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center transform transition-transform group-hover:scale-110">
            <Activity className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Sports Club</h1>
            <p className="text-xs text-gray-500 mt-1">Yönetim Paneli</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {menuItems.map((item) => {
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
                  <Icon size={18} />
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