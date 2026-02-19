'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Scale, Toilet, Activity, Brain } from 'lucide-react';

const tabs = [
  { name: '사용자 정보', href: '/dashboard', icon: User },
  { name: '체중 관리', href: '/dashboard/weight', icon: Scale },
  { name: '배변 관리', href: '/dashboard/bowel', icon: Toilet },
  { name: '질병 관리', href: '/dashboard/disease', icon: Activity },
  { name: '질병 분석', href: '/dashboard/analysis', icon: Brain },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] md:relative md:border-t-0 md:border-r md:w-64 md:min-h-screen">
      <div className="flex md:flex-col md:pt-6">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href ||
            (tab.href !== '/dashboard' && pathname.startsWith(tab.href));
          const Icon = tab.icon;

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex-1 md:flex-none flex flex-col md:flex-row items-center md:gap-3 py-3 px-2 md:px-6 md:py-3 text-xs md:text-sm transition-colors ${
                isActive
                  ? 'text-[#7C3AED] bg-purple-50 md:border-r-2 md:border-[#7C3AED]'
                  : 'text-[#6B7280] hover:bg-[#F9FAFB]'
              }`}
            >
              <Icon className="w-5 h-5 mb-1 md:mb-0" />
              <span className="truncate">{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
