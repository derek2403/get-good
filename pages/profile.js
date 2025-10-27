import { useState, useEffect } from 'react';
import Head from 'next/head';
import BottomNav from '../components/BottomNav';
import { User, Scale, TrendingUp, Calendar, X, Check } from 'lucide-react';

export default function Profile() {
  const [profileData, setProfileData] = useState(null);
  const [weightHistory, setWeightHistory] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setPageLoading(true);
    try {
      const response = await fetch('/api/profile/profile');
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        setPageLoading(false);
        return;
      }
      
      if (data.profile) {
        setProfileData(data.profile);
        setWeightHistory(data.weightHistory || []);
      }
    } catch (err) {
      setError('Failed to load profile data. Make sure you have a "Profile" sheet in your Google Sheets.');
      console.error(err);
    } finally {
      setPageLoading(false);
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return 0;
    
    // Parse DD/MM/YYYY format
    let birthDate;
    if (dob.includes('/')) {
      const parts = dob.split('/');
      if (parts.length === 3) {
        // Assume DD/MM/YYYY format
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // Month is 0-indexed
        const year = parseInt(parts[2]);
        birthDate = new Date(year, month, day);
      } else {
        birthDate = new Date(dob);
      }
    } else {
      birthDate = new Date(dob);
    }
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const calculateTDEE = (weightKg, heightCm, age) => {
    // BMR = (10×weight (kg)+6.25×height (cm)−5×age (years)+5) x 1.9
    const bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
    const tdee = bmr * 1.9;
    return Math.round(tdee);
  };

  const handleSaveWeight = async () => {
    if (!weight || weight <= 0) {
      setError('Please enter a valid weight');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const age = calculateAge(profileData.dob);
      const heightCm = parseFloat(profileData.height);
      const weightKg = parseFloat(weight);
      
      const tdee = calculateTDEE(weightKg, heightCm, age);
      
      const today = new Date().toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });

      const response = await fetch('/api/profile/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: today,
          weight: weightKg,
          tdee: tdee,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Weight logged successfully!');
        setWeight('');
        // Reload profile data to show updated TDEE
        await loadProfile();
        setTimeout(() => {
          setShowPopup(false);
          setSuccess('');
        }, 1000);
      } else {
        setError('Failed to save weight');
      }
    } catch (err) {
      setError('Failed to save weight');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getLatestWeight = () => {
    if (weightHistory.length === 0) return 'N/A';
    return weightHistory[weightHistory.length - 1][1] + ' kg';
  };

  const getLatestTDEE = () => {
    if (weightHistory.length === 0) return 'N/A';
    const tdee = weightHistory[weightHistory.length - 1][2];
    return tdee ? tdee + ' cal' : 'N/A';
  };

  return (
    <>
      <Head>
        <title>Profile - Get Good</title>
        <meta name="description" content="Your fitness profile" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-20">
        <div className="container mx-auto px-4 py-6 max-w-md">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2 text-gray-900">{getGreeting()}! 👤</h1>
            <p className="text-gray-600">Your fitness journey</p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}

          {/* Loading State */}
          {pageLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          )}

          {/* Setup Instructions */}
          {!pageLoading && !profileData && (
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="text-purple-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3 text-center">Setup Required</h2>
              <p className="text-gray-600 mb-6 text-center">
                Create a "Profile" sheet in your Google Sheets to get started.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Sheet Structure:</h3>
                <div className="text-sm text-gray-700 space-y-1">
                  <p><strong>A1:</strong> Name | <strong>B1:</strong> {'{Your Name}'}</p>
                  <p><strong>A2:</strong> DOB | <strong>B2:</strong> DD/MM/YYYY</p>
                  <p><strong>A3:</strong> Goal (kg) | <strong>B3:</strong> {'{Your Goal}'}</p>
                  <p><strong>A4:</strong> Height | <strong>B4:</strong> {'{Height in cm}'}</p>
                  <p className="pt-2"><strong>D1:</strong> Date | <strong>E1:</strong> Weight | <strong>F1:</strong> TDEE</p>
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="text-sm text-blue-700">
                  <strong>Example:</strong> Name: Derek, DOB: 24/02/2003, Goal: 75, Height: 177
                </p>
              </div>
            </div>
          )}

          {/* Profile Card */}
          {!pageLoading && profileData && (
            <>
              <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 mb-4">
                <div className="flex items-center mb-4">
                  <div className="bg-gradient-to-br from-purple-500 to-blue-600 w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {profileData.name?.charAt(0) || 'U'}
                  </div>
                  <div className="ml-4">
                    <h2 className="text-xl font-bold text-gray-900">{profileData.name || 'User'}</h2>
                    <p className="text-sm text-gray-500">{calculateAge(profileData.dob)} years old</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Height</p>
                    <p className="text-lg font-bold text-gray-900">{profileData.height} cm</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Goal</p>
                    <p className="text-lg font-bold text-gray-900">{profileData.goal} kg</p>
                  </div>
                </div>
              </div>

              {/* Stats Card */}
              <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 mb-4">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Current Stats</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Scale className="text-blue-600" size={20} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Latest Weight</p>
                        <p className="text-lg font-bold text-gray-900">{getLatestWeight()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 p-2 rounded-lg">
                        <TrendingUp className="text-green-600" size={20} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">TDEE</p>
                        <p className="text-lg font-bold text-gray-900">{getLatestTDEE()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowPopup(true)}
                  className="w-full mt-4 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white font-semibold py-3 rounded-lg shadow-md transition flex items-center justify-center gap-2"
                >
                  <Scale size={18} />
                  Log Today's Weight
                </button>
              </div>

              {/* Weight History */}
              {weightHistory.length > 0 && (
                <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar size={20} />
                    Weight History
                  </h3>
                  
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {[...weightHistory].reverse().map((entry, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <span className="text-sm text-gray-600">{entry[0]}</span>
                        <div className="flex gap-4">
                          <span className="text-sm font-semibold text-gray-900">{entry[1]} kg</span>
                          <span className="text-sm text-gray-500">{entry[2]} cal</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Weight Input Popup */}
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Scale className="text-purple-600" size={24} />
                Log Your Weight
              </h3>
              <button
                onClick={() => setShowPopup(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={24} />
              </button>
            </div>

            <p className="text-gray-600 mb-6">Enter your weight for today to track your progress and update your TDEE.</p>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Weight (kg)</label>
              <input
                type="number"
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="75.5"
                className="w-full px-4 py-4 text-lg bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                autoFocus
              />
            </div>

            <button
              onClick={handleSaveWeight}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 rounded-lg shadow-md transition disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                'Saving...'
              ) : (
                <>
                  <Check size={18} />
                  Save Weight
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </>
  );
}
