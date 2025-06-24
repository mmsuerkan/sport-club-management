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
  GraduationCap
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
    title: 'Üyeler',
    icon: UsersIcon,
    href: '/dashboard/members'
  },
  {
    title: 'Antrenmanlar',
    icon: Calendar,
    href: '/dashboard/trainings'
  },
  {
    title: 'Turnuvalar',
    icon: Trophy,
    href: '/dashboard/tournaments'
  },
  {
    title: 'Aktiviteler',
    icon: Activity,
    href: '/dashboard/activities'
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
    <div className="w-[280px] bg-white border-r border-gray-200 h-screen overflow-y-auto">
      <div className="p-5 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Sports Club</h1>
        <p className="text-sm text-gray-500 mt-1">Yönetim Paneli</p>
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
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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