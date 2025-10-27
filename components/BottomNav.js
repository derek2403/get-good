import { useRouter } from 'next/router';
import { Dumbbell, Apple, User } from 'lucide-react';

export default function BottomNav() {
  const router = useRouter();
  
  const navItems = [
    {
      name: 'Workouts',
      icon: Dumbbell,
      path: '/workout',
      activeColor: 'text-blue-600',
      activeBg: 'bg-blue-50',
    },
    {
      name: 'Diet',
      icon: Apple,
      path: '/diet',
      activeColor: 'text-green-600',
      activeBg: 'bg-green-50',
    },
    {
      name: 'Profile',
      icon: User,
      path: '/profile',
      activeColor: 'text-purple-600',
      activeBg: 'bg-purple-50',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg md:hidden z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = router.pathname === item.path;
          
          return (
            <button
              key={item.name}
              onClick={() => router.push(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 ${
                isActive ? item.activeBg : 'hover:bg-gray-50'
              }`}
            >
              <Icon
                size={24}
                className={`mb-1 transition-colors ${
                  isActive ? item.activeColor : 'text-gray-500'
                }`}
              />
              <span
                className={`text-xs font-medium transition-colors ${
                  isActive ? item.activeColor : 'text-gray-600'
                }`}
              >
                {item.name}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

