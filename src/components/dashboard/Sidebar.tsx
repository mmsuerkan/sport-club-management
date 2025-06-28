'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home,
  Users,
  Calendar,
  DollarSign,
  Settings,
  BarChart,
  FileText,
  Activity,
  Building,
  UsersIcon,
  GraduationCap,
  Dumbbell,
  ClipboardCheck
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
    <div className="w-[280px] bg-white border-r border-gray-200 h-screen flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Sports Club</h1>
        <p className="text-xs text-gray-500 mt-1">Yönetim Paneli</p>
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
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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