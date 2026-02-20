'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Scale, CircleDot, Activity, Brain } from 'lucide-react';

const tabs = [
  { name: '사용자', href: '/dashboard', icon: User },
  { name: '체중', href: '/dashboard/weight', icon: Scale },
  { name: '배변', href: '/dashboard/bowel', icon: CircleDot },
  { name: '증상', href: '/dashboard/disease', icon: Activity },
  { name: 'AI분석', href: '/dashboard/analysis', icon: Brain },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] z-50">
      <div className="max-w-lg mx-auto flex">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href ||
            (tab.href !== '/dashboard' && pathname.startsWith(tab.href));
          const Icon = tab.icon;

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
                isActive
                  ? 'text-[#7C3AED]'
                  : 'text-[#9CA3AF]'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" strokeWidth={isActive ? 2.5 : 1.5} />
              <span>{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
