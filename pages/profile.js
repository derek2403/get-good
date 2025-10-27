import { useState, useEffect } from 'react';
import Head from 'next/head';
import BottomNav from '../components/BottomNav';
import { User, Scale, TrendingUp, X, Check, Activity, Flame } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Profile() {
  const [profileData, setProfileData] = useState(null);
  const [weightHistory, setWeightHistory] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('weight');
  
  const [deficitHistory, setDeficitHistory] = useState([]);
  const [deficitStats, setDeficitStats] = useState(null);
  const [loadingDeficit, setLoadingDeficit] = useState(false);
  
  // Run stats
  const [runStats, setRunStats] = useState(null);

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

  const loadDeficitHistory = async () => {
    setLoadingDeficit(true);
    try {
      const response = await fetch(`/api/diet/deficit-history?limit=45`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load deficit history');
      }

      setDeficitHistory(Array.isArray(data.history) ? data.history : []);
      setDeficitStats(data.stats || null);
    } catch (err) {
      console.error('Failed to load deficit history:', err);
      setError('Failed to load deficit history');
    } finally {
      setLoadingDeficit(false);
    }
  };

  const loadRunStats = async () => {
    try {
      const response = await fetch('/api/history/runs');
      const data = await response.json();
      setRunStats(data);
    } catch (err) {
      console.error('Failed to load run stats:', err);
    }
  };

  // Load run stats when switching to runs tab
  useEffect(() => {
    if (activeTab === 'runs' && !runStats) {
      loadRunStats();
    }
    if (activeTab === 'deficit' && deficitHistory.length === 0 && !loadingDeficit) {
      loadDeficitHistory();
    }
  }, [activeTab, runStats, deficitHistory.length, loadingDeficit]);

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

  const formatDateLabel = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatKcal = (value) => {
    if (!Number.isFinite(value)) {
      return '0 kcal';
    }
    const rounded = Math.round(value);
    const sign = rounded > 0 ? '+' : '';
    return `${sign}${rounded} kcal`;
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

              {/* History Section with Tabs */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                {/* Tab Header */}
                <div className="flex border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab('weight')}
                    className={`flex-1 py-3 text-sm font-semibold transition ${
                      activeTab === 'weight'
                        ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Weight
                  </button>
                  <button
                    onClick={() => setActiveTab('deficit')}
                    className={`flex-1 py-3 text-sm font-semibold transition ${
                      activeTab === 'deficit'
                        ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Deficit
                  </button>
                  <button
                    onClick={() => setActiveTab('runs')}
                    className={`flex-1 py-3 text-sm font-semibold transition ${
                      activeTab === 'runs'
                        ? 'bg-cyan-50 text-cyan-600 border-b-2 border-cyan-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Runs
                  </button>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {/* Weight Tab */}
                  {activeTab === 'weight' && weightHistory.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <TrendingUp size={20} />
                        Weight Progress
                      </h3>
                      
                      <div className="w-full h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={weightHistory.map(entry => ({
                              date: entry[0],
                              weight: parseFloat(entry[1]) || 0
                            }))}
                            margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis 
                              dataKey="date" 
                              tick={{ fontSize: 12, fill: '#6b7280' }}
                              angle={-45}
                              textAnchor="end"
                              height={60}
                            />
                            <YAxis 
                              tick={{ fontSize: 12, fill: '#6b7280' }}
                              label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6b7280' } }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#ffffff', 
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                padding: '8px 12px'
                              }}
                              labelStyle={{ color: '#6b7280', fontSize: 12 }}
                              itemStyle={{ color: '#8b5cf6', fontWeight: 600 }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="weight" 
                              stroke="#8b5cf6" 
                              strokeWidth={2}
                              dot={{ fill: '#8b5cf6', r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Weight Stats */}
                      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-200">
                        <div className="text-center">
                          <p className="text-xs text-gray-500">Lowest</p>
                          <p className="text-sm font-bold text-gray-900">
                            {Math.min(...weightHistory.map(e => parseFloat(e[1]) || 0))} kg
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500">Current</p>
                          <p className="text-sm font-bold text-purple-600">
                            {weightHistory[weightHistory.length - 1][1]} kg
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500">Highest</p>
                          <p className="text-sm font-bold text-gray-900">
                            {Math.max(...weightHistory.map(e => parseFloat(e[1]) || 0))} kg
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Deficit Tab */}
                  {activeTab === 'deficit' && (
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Flame size={20} />
                        Calorie Deficit Trend
                      </h3>

                      {loadingDeficit ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
                        </div>
                      ) : deficitHistory.length === 0 ? (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center text-sm text-orange-700">
                          No deficit history found. Log meals in the Diet tab to build your trend.
                        </div>
                      ) : (
                        <>
                          <div className="w-full h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={deficitHistory.map((entry) => ({
                                  date: formatDateLabel(entry.date),
                                  deficit: Math.round(entry.deficit),
                                }))}
                                margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                  dataKey="date"
                                  tick={{ fontSize: 12, fill: '#6b7280' }}
                                  angle={-45}
                                  textAnchor="end"
                                  height={60}
                                />
                                <YAxis
                                  tick={{ fontSize: 12, fill: '#6b7280' }}
                                  label={{
                                    value: 'Deficit (kcal)',
                                    angle: -90,
                                    position: 'insideLeft',
                                    style: { fontSize: 12, fill: '#6b7280' },
                                  }}
                                />
                                <Tooltip
                                  formatter={(value) => [formatKcal(value), 'Deficit']}
                                  labelFormatter={(label) => `Date: ${label}`}
                                  contentStyle={{
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    padding: '8px 12px',
                                  }}
                                  labelStyle={{ color: '#6b7280', fontSize: 12 }}
                                  itemStyle={{ color: '#f97316', fontWeight: 600 }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="deficit"
                                  stroke="#f97316"
                                  strokeWidth={2}
                                  dot={{ fill: '#f97316', r: 4 }}
                                  activeDot={{ r: 6 }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>

                          {deficitStats && (
                            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-200">
                              <div className="text-center">
                                <p className="text-xs text-gray-500">Minimum</p>
                                <p className="text-sm font-bold text-gray-900">{formatKcal(deficitStats.min)}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-gray-500">Average</p>
                                <p className="text-sm font-bold text-orange-600">{formatKcal(deficitStats.average)}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-gray-500">Maximum</p>
                                <p className="text-sm font-bold text-gray-900">{formatKcal(deficitStats.max)}</p>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Runs Tab */}
                  {activeTab === 'runs' && (
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Activity size={20} />
                        Run Statistics
                      </h3>
                      
                      {!runStats ? (
                        <p className="text-center text-gray-500 py-8">Loading...</p>
                      ) : runStats.totalRuns === 0 ? (
                        <p className="text-center text-gray-500 py-8">No run history yet</p>
                      ) : (
                        <div>
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg p-4 border border-cyan-200">
                              <p className="text-xs text-gray-600 mb-1">Total Distance</p>
                              <p className="text-2xl font-bold text-cyan-700">{runStats.totalDistance} km</p>
                            </div>
                            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                              <p className="text-xs text-gray-600 mb-1">Total Runs</p>
                              <p className="text-2xl font-bold text-purple-700">{runStats.totalRuns}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                              <p className="text-xs text-gray-600 mb-1">Avg Pace</p>
                              <p className="text-xl font-bold text-green-700">{runStats.avgPace}</p>
                              <p className="text-xs text-gray-500">min/km</p>
                            </div>
                            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-200">
                              <p className="text-xs text-gray-600 mb-1">Avg Cadence</p>
                              <p className="text-xl font-bold text-orange-700">{runStats.avgCadence}</p>
                              <p className="text-xs text-gray-500">spm</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
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
