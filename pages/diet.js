import { useState } from 'react';
import Head from 'next/head';
import BottomNav from '../components/BottomNav';
import { Apple, Coffee, Salad, Pizza } from 'lucide-react';

export default function Diet() {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <>
      <Head>
        <title>Diet - Get Good</title>
        <meta name="description" content="Track your diet" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-20">
        <div className="container mx-auto px-4 py-6 max-w-md">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2 text-gray-900">{getGreeting()}! 🍎</h1>
            <p className="text-gray-600">Track your nutrition</p>
          </div>

          {/* Coming Soon Card */}
          <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200 text-center">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Apple className="text-green-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Coming Soon</h2>
            <p className="text-gray-600 mb-6">
              Diet tracking features will be available soon. Stay tuned!
            </p>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <Coffee className="text-gray-600 mx-auto mb-2" size={20} />
                <p className="text-gray-700 font-medium">Meal Logging</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <Salad className="text-gray-600 mx-auto mb-2" size={20} />
                <p className="text-gray-700 font-medium">Calorie Tracking</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <Pizza className="text-gray-600 mx-auto mb-2" size={20} />
                <p className="text-gray-700 font-medium">Macro Analysis</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <Apple className="text-gray-600 mx-auto mb-2" size={20} />
                <p className="text-gray-700 font-medium">Nutrition Goals</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </>
  );
}

