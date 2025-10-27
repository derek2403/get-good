import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Dumbbell, Activity, ChevronRight, Check, Home, Calendar, ChevronLeft } from 'lucide-react';
import BottomNav from '../components/BottomNav';

export default function Workout() {
  // Step flow: 'start' -> 'select-workout-type' or 'run-form' -> 'exercise-list' -> 'exercise-input'
  const [step, setStep] = useState('start');
  const [activityType, setActivityType] = useState(''); // 'gym' or 'run'
  
  // Workout mode states
  const [availableSheets, setAvailableSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [workouts, setWorkouts] = useState([]);
  const [sessionName, setSessionName] = useState('');
  const [sessionColumn, setSessionColumn] = useState(null);
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState(null);
  const [exerciseData, setExerciseData] = useState({
    weight: '',
    sets: '',
    reps: '',
  });
  const [workoutDataStore, setWorkoutDataStore] = useState({});
  
  // Run mode states
  const [runData, setRunData] = useState({
    session: '',
    distance: '',
    duration: '',
    pace: '',
    cadence: '',
  });
  
  // Common states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Calendar states
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [workoutDates, setWorkoutDates] = useState([]);
  const [runDates, setRunDates] = useState([]);

  // Load sheets and activities on mount
  useEffect(() => {
    loadSheets();
    loadActivities();
  }, []);

  const loadSheets = async () => {
    try {
      const response = await fetch('/api/workout/get-sheets');
      const data = await response.json();
      if (data.sheetNames) {
        const workoutSheets = data.sheetNames.filter(sheet => sheet !== 'Run');
        setAvailableSheets(workoutSheets);
      }
    } catch (err) {
      setError('Failed to load workout sheets');
      console.error(err);
    }
  };

  const loadActivities = async () => {
    try {
      const response = await fetch('/api/calendar/activities');
      const data = await response.json();
      if (data.workoutDates) setWorkoutDates(data.workoutDates);
      if (data.runDates) setRunDates(data.runDates);
    } catch (err) {
      console.error('Failed to load activities:', err);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const isToday = (day) => {
    const now = new Date();
    const malaysiaNow = new Date(
      now.getTime() + now.getTimezoneOffset() * 60000 + 8 * 60 * 60000
    );
    const checkUtc = Date.UTC(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const malaysiaCheck = new Date(checkUtc + 8 * 60 * 60000);
    return malaysiaCheck.toDateString() === malaysiaNow.toDateString();
  };

  const toMalaysiaDateKey = (year, month, day) => {
    const utc = Date.UTC(year, month, day);
    const malaysia = new Date(utc + 8 * 60 * 60000);
    return malaysia.toISOString().split('T')[0];
  };

  const hasWorkout = (day) => {
    const dateStr = toMalaysiaDateKey(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return workoutDates.includes(dateStr);
  };

  const hasRun = (day) => {
    const dateStr = toMalaysiaDateKey(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return runDates.includes(dateStr);
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const generateSessionName = () => {
    const now = new Date();
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    };
    return now.toLocaleString('en-US', options);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handleActivitySelect = (type) => {
    setActivityType(type);
    setSessionName(generateSessionName());
    if (type === 'gym') {
      setStep('select-workout-type');
    } else {
      setRunData({ ...runData, session: generateSessionName() });
      setStep('run-form');
    }
  };

  const handleWorkoutTypeSelect = async (sheetName) => {
    setSelectedSheet(sheetName);
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/workout/get-workouts?sheetName=${sheetName}`);
      const data = await response.json();

      if (data.workouts) {
        setWorkouts(data.workouts);
        setStep('exercise-list');
      }
    } catch (err) {
      setError('Failed to load workouts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExerciseClick = (index) => {
    setSelectedExerciseIndex(index);
    setExerciseData({ weight: '', sets: '', reps: '' });
    setStep('exercise-input');
  };

  const saveExercise = async () => {
    if (!exerciseData.weight && !exerciseData.sets && !exerciseData.reps) {
      setError('Please enter at least one value');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Update local workout data store
      const updatedStore = {
        ...workoutDataStore,
        [selectedExerciseIndex]: `${exerciseData.weight || '0'}/${exerciseData.sets || '0'}/${exerciseData.reps || '0'}`
      };
      setWorkoutDataStore(updatedStore);

      // Prepare workout data array with all exercises
      const workoutData = workouts.map((workout, index) => {
        return [updatedStore[index] || ''];
      });

      // Save the entire session (this will update the same column if it exists)
      const saveResponse = await fetch('/api/workout/save-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sheetName: selectedSheet,
          sessionName,
          workoutData,
          existingColumn: sessionColumn,
        }),
      });

      const result = await saveResponse.json();

      if (result.success) {
        // Store the column for future updates in this session
        if (!sessionColumn) {
          setSessionColumn(result.column);
        }
        
        setSuccess('Exercise saved!');
        setTimeout(() => {
          setSuccess('');
          setStep('exercise-list');
        }, 1000);
      }
    } catch (err) {
      setError('Failed to save exercise');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveRunSession = async () => {
    if (!runData.session) {
      setError('Session name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/run/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(runData),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Run session saved!');
        setTimeout(() => {
          resetToStart();
        }, 1500);
      } else {
        setError('Failed to save run session');
      }
    } catch (err) {
      setError('Failed to save run session');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetToStart = () => {
    setStep('start');
    setActivityType('');
    setSelectedSheet('');
    setWorkouts([]);
    setSessionColumn(null);
    setSelectedExerciseIndex(null);
    setExerciseData({ weight: '', sets: '', reps: '' });
    setWorkoutDataStore({});
    setRunData({ session: '', distance: '', duration: '', pace: '', cadence: '' });
    setError('');
    setSuccess('');
  };

  return (
    <>
      <Head>
        <title>Fitness Tracker - Get Good</title>
        <meta name="description" content="Track your workouts and runs" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-20">
        <div className="container mx-auto px-4 py-6 max-w-md">
          {/* Header */}
          <div className="mb-6">
            {step === 'start' ? (
              <>
                <h1 className="text-3xl font-bold mb-2 text-gray-900">👋 {getGreeting()}!</h1>
                <p className="text-gray-600">What are you doing today?</p>
              </>
            ) : (
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">
                  {activityType === 'gym' ? '💪 Gym' : '🏃 Run'}
                </h1>
                <button
                  onClick={resetToStart}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition"
                >
                  <Home size={20} />
                </button>
              </div>
            )}
          </div>

          {/* Error/Success Messages */}
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

          {/* Step: Start - Choose Activity */}
          {step === 'start' && (
            <>
              <div className="space-y-4 mb-6">
                <button
                  onClick={() => handleActivitySelect('gym')}
                  className="w-full bg-white border-2 border-gray-200 hover:border-blue-500 rounded-xl p-6 transition shadow-sm hover:shadow-md group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 p-3 rounded-lg group-hover:bg-blue-500 transition">
                        <Dumbbell className="text-blue-600 group-hover:text-white" size={24} />
                      </div>
                      <div className="text-left">
                        <h3 className="text-xl font-semibold text-gray-900">Gym Workout</h3>
                        <p className="text-sm text-gray-500">Track your strength training</p>
                      </div>
                    </div>
                    <ChevronRight className="text-gray-400 group-hover:text-blue-500" size={24} />
                  </div>
                </button>

                <button
                  onClick={() => handleActivitySelect('run')}
                  className="w-full bg-white border-2 border-gray-200 hover:border-cyan-500 rounded-xl p-6 transition shadow-sm hover:shadow-md group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-cyan-100 p-3 rounded-lg group-hover:bg-cyan-500 transition">
                        <Activity className="text-cyan-600 group-hover:text-white" size={24} />
                      </div>
                      <div className="text-left">
                        <h3 className="text-xl font-semibold text-gray-900">Run</h3>
                        <p className="text-sm text-gray-500">Log your running session</p>
                      </div>
                    </div>
                    <ChevronRight className="text-gray-400 group-hover:text-cyan-500" size={24} />
                  </div>
                </button>
              </div>

              {/* Activity Calendar */}
              <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={previousMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                  >
                    <ChevronLeft size={20} className="text-gray-600" />
                  </button>
                  <h3 className="text-lg font-bold text-gray-900">
                    {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </h3>
                  <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                  >
                    <ChevronRight size={20} className="text-gray-600" />
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Day headers */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
                      {day}
                    </div>
                  ))}

                  {/* Calendar days */}
                  {(() => {
                    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
                    const days = [];

                    // Empty cells before first day
                    for (let i = 0; i < startingDayOfWeek; i++) {
                      days.push(<div key={`empty-${i}`} className="aspect-square" />);
                    }

                    // Actual days
                    for (let day = 1; day <= daysInMonth; day++) {
                      const today = isToday(day);
                      const workout = hasWorkout(day);
                      const run = hasRun(day);

                      days.push(
                        <div
                          key={day}
                          className={`aspect-square flex items-center justify-center relative rounded-lg transition ${
                            today ? 'bg-gray-100' : 'hover:bg-gray-50'
                          }`}
                        >
                          <span
                            className={`text-sm ${
                              today ? 'font-bold text-gray-900' : 'text-gray-700'
                            } ${workout ? 'relative' : ''}`}
                            style={workout ? { 
                              border: '2px solid #10b981', 
                              borderRadius: '50%',
                              width: '28px',
                              height: '28px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            } : {}}
                          >
                            {day}
                          </span>
                          {run && (
                            <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                          )}
                        </div>
                      );
                    }

                    return days;
                  })()}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 border-2 border-green-500 rounded-full" />
                    <span className="text-xs text-gray-600">Gym</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <span className="text-xs text-gray-600">Run</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Step: Select Workout Type */}
          {step === 'select-workout-type' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">Choose your workout type:</p>
              {availableSheets.map((sheet) => (
                <button
                  key={sheet}
                  onClick={() => handleWorkoutTypeSelect(sheet)}
                  disabled={loading}
                  className="w-full bg-white border-2 border-gray-200 hover:border-purple-500 rounded-lg p-4 transition shadow-sm hover:shadow-md group disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-gray-900">{sheet}</span>
                    <ChevronRight className="text-gray-400 group-hover:text-purple-500" size={20} />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step: Exercise List */}
          {step === 'exercise-list' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedSheet}</h2>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar size={12} />
                    {sessionName}
                  </p>
                </div>
              </div>

              {workouts.map((workout, index) => (
                <button
                  key={index}
                  onClick={() => handleExerciseClick(index)}
                  className="w-full bg-white border-2 border-gray-200 hover:border-blue-500 rounded-lg p-4 transition shadow-sm hover:shadow-md group text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {workoutDataStore[index] && (
                        <div className="bg-green-100 p-1 rounded">
                          <Check className="text-green-600" size={16} />
                        </div>
                      )}
                      <span className="text-gray-900 font-medium">{workout}</span>
                    </div>
                    <ChevronRight className="text-gray-400 group-hover:text-blue-500" size={20} />
                  </div>
                </button>
              ))}

              <button
                onClick={resetToStart}
                className="w-full mt-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-4 rounded-lg shadow-md transition"
              >
                End Session
              </button>
            </div>
          )}

          {/* Step: Exercise Input */}
          {step === 'exercise-input' && selectedExerciseIndex !== null && (
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">{workouts[selectedExerciseIndex]}</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Weight (lbs)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={exerciseData.weight}
                    onChange={(e) => setExerciseData({ ...exerciseData, weight: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-4 text-lg bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Sets</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={exerciseData.sets}
                    onChange={(e) => setExerciseData({ ...exerciseData, sets: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-4 text-lg bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Reps</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={exerciseData.reps}
                    onChange={(e) => setExerciseData({ ...exerciseData, reps: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-4 text-lg bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={saveExercise}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 rounded-lg shadow-md transition disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setStep('exercise-list')}
                  disabled={loading}
                  className="px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-4 rounded-lg transition"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Step: Run Form */}
          {step === 'run-form' && (
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Log Your Run</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Session Name</label>
                  <input
                    type="text"
                    value={runData.session}
                    onChange={(e) => setRunData({ ...runData, session: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900"
                    placeholder="e.g., Morning Run"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Distance</label>
                  <input
                    type="text"
                    value={runData.distance}
                    onChange={(e) => setRunData({ ...runData, distance: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900"
                    placeholder="e.g., 5 km"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Duration</label>
                  <input
                    type="text"
                    value={runData.duration}
                    onChange={(e) => setRunData({ ...runData, duration: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900"
                    placeholder="e.g., 25:30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Pace</label>
                  <input
                    type="text"
                    value={runData.pace}
                    onChange={(e) => setRunData({ ...runData, pace: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900"
                    placeholder="e.g., 5:06/km"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cadence</label>
                  <input
                    type="text"
                    value={runData.cadence}
                    onChange={(e) => setRunData({ ...runData, cadence: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900"
                    placeholder="e.g., 170 spm"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={saveRunSession}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 rounded-lg shadow-md transition disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save Run'}
                </button>
                <button
                  onClick={resetToStart}
                  disabled={loading}
                  className="px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-4 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </>
  );
}
