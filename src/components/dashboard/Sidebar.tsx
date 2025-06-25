'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home,
  Users,
  Calendar,
  Trophy,
  DollarSign,
  Settings,
  BarChart,
  FileText,
  Activity,
  Building,
  UsersIcon,
  GraduationCap,
  Dumbbell
} from 'lucide-react';

const menuItems = [
  {
    title: 'Dashboard',
    icon: Home,
    href: '/dashboard'
  },
  {
    title: 'Şubeler',
    icon: Building,
    href: '/dashboard/branches'
  },
  {
    title: 'Gruplar',
    icon: UsersIcon,
    href: '/dashboard/groups'
  },
  {
    title: 'Öğrenciler',
    icon: GraduationCap,
    href: '/dashboard/students'
  },
  {
    title: 'Antrenörler',
    icon: Users,
    href: '/dashboard/trainers'
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
    icon: Activity,
    href: '/dashboard/events'
  },
  {
    title: 'Finansal',
    icon: DollarSign,
    href: '/dashboard/finance'
  },
  {
    title: 'Raporlar',
    icon: BarChart,
    href: '/dashboard/reports'
  },
  {
    title: 'Belgeler',
    icon: FileText,
    href: '/dashboard/documents'
  },
  {
    title: 'Ayarlar',
    icon: Settings,
    href: '/dashboard/settings'
  }
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-[280px] bg-gray-800/50 backdrop-blur-md border-r border-gray-700 h-screen overflow-y-auto">
      <div className="p-5 border-b border-gray-700">
        <h1 className="text-2xl font-bold text-white">Sports Club</h1>
        <p className="text-sm text-gray-400 mt-1">Yönetim Paneli</p>
      </div>

      <nav className="p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 font-medium border-l-4 border-blue-500'
                      : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}