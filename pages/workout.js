import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Workout() {
  // Mode: 'workout' or 'run'
  const [mode, setMode] = useState('workout');
  
  // Workout mode states
  const [availableSheets, setAvailableSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [workouts, setWorkouts] = useState([]);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [workoutInputs, setWorkoutInputs] = useState({});
  
  // Run mode states
  const [runSessions, setRunSessions] = useState([]);
  const [showRunForm, setShowRunForm] = useState(false);
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

  // Load data on mount and mode change
  useEffect(() => {
    if (mode === 'workout') {
      loadSheets();
    } else if (mode === 'run') {
      loadRunSessions();
    }
  }, [mode]);

  const loadSheets = async () => {
    try {
      const response = await fetch('/api/workout/get-sheets');
      const data = await response.json();
      if (data.sheetNames) {
        // Filter out 'Run' sheet from workout options
        const workoutSheets = data.sheetNames.filter(sheet => sheet !== 'Run');
        setAvailableSheets(workoutSheets);
      }
    } catch (err) {
      setError('Failed to load workout sheets');
      console.error(err);
    }
  };

  const loadRunSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/run/run');
      const data = await response.json();
      if (data.sessions) {
        setRunSessions(data.sessions);
      }
    } catch (err) {
      setError('Failed to load run sessions');
      console.error(err);
    } finally {
      setLoading(false);
    }
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

  // Workout mode functions
  const startSession = async () => {
    if (!selectedSheet) {
      setError('Please select a workout type');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/workout/get-workouts?sheetName=${selectedSheet}`);
      const data = await response.json();

      if (data.workouts) {
        setWorkouts(data.workouts);
        setSessionName(generateSessionName());
        setSessionStarted(true);
        
        // Initialize workout inputs
        const inputs = {};
        data.workouts.forEach((workout, index) => {
          inputs[index] = { weight: '', sets: '', reps: '' };
        });
        setWorkoutInputs(inputs);
      }
    } catch (err) {
      setError('Failed to load workouts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (index, field, value) => {
    setWorkoutInputs({
      ...workoutInputs,
      [index]: {
        ...workoutInputs[index],
        [field]: value,
      },
    });
  };

  const endSession = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Prepare workout data in the format: ["weight/sets/reps"]
      const workoutData = workouts.map((workout, index) => {
        const input = workoutInputs[index];
        if (input.weight || input.sets || input.reps) {
          return [`${input.weight || '0'}/${input.sets || '0'}/${input.reps || '0'}`];
        }
        return [''];
      });

      const response = await fetch('/api/workout/save-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sheetName: selectedSheet,
          sessionName,
          workoutData,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Workout session saved successfully!');
        // Reset the form
        setTimeout(() => {
          setSessionStarted(false);
          setSelectedSheet('');
          setWorkouts([]);
          setWorkoutInputs({});
          setSuccess('');
        }, 2000);
      } else {
        setError('Failed to save workout session');
      }
    } catch (err) {
      setError('Failed to save workout session');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const cancelSession = () => {
    setSessionStarted(false);
    setSelectedSheet('');
    setWorkouts([]);
    setWorkoutInputs({});
    setError('');
    setSuccess('');
  };

  // Run mode functions
  const startNewRunSession = () => {
    setRunData({
      session: generateSessionName(),
      distance: '',
      duration: '',
      pace: '',
      cadence: '',
    });
    setShowRunForm(true);
    setError('');
    setSuccess('');
  };

  const cancelRunSession = () => {
    setShowRunForm(false);
    setRunData({
      session: '',
      distance: '',
      duration: '',
      pace: '',
      cadence: '',
    });
    setError('');
    setSuccess('');
  };

  const saveRunSession = async () => {
    if (!runData.session) {
      setError('Session name is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

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
        setSuccess('Run session saved successfully!');
        // Reload sessions
        await loadRunSessions();
        // Reset form after short delay
        setTimeout(() => {
          cancelRunSession();
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

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setSuccess('');
    setSessionStarted(false);
    setShowRunForm(false);
  };

  return (
    <>
      <Head>
        <title>Fitness Tracker - Get Good</title>
        <meta name="description" content="Track your workouts and runs" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <h1 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Fitness Tracker
          </h1>

          {/* Mode Tabs */}
          <div className="flex justify-center mb-8">
            <div className="bg-gray-800 rounded-lg p-1 inline-flex">
              <button
                onClick={() => switchMode('workout')}
                className={`px-6 py-2 rounded-md font-semibold transition ${
                  mode === 'workout'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                💪 Workout
              </button>
              <button
                onClick={() => switchMode('run')}
                className={`px-6 py-2 rounded-md font-semibold transition ${
                  mode === 'run'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                🏃 Run
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-200 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500 bg-opacity-20 border border-green-500 text-green-200 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}

          {/* Workout Mode */}
          {mode === 'workout' && (
            <>
              {!sessionStarted ? (
                <div className="bg-gray-800 rounded-lg shadow-xl p-8">
                  <h2 className="text-2xl font-semibold mb-6">Start New Workout Session</h2>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">Select Workout Type</label>
                    <select
                      value={selectedSheet}
                      onChange={(e) => setSelectedSheet(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    >
                      <option value="">Choose a workout...</option>
                      {availableSheets.map((sheet) => (
                        <option key={sheet} value={sheet}>
                          {sheet}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={startSession}
                    disabled={loading || !selectedSheet}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Loading...' : 'Start Session'}
                  </button>
                </div>
              ) : (
                <div className="bg-gray-800 rounded-lg shadow-xl p-8">
                  <div className="mb-6">
                    <h2 className="text-2xl font-semibold">{selectedSheet}</h2>
                    <p className="text-gray-400">{sessionName}</p>
                  </div>

                  <div className="space-y-4 mb-8">
                    {workouts.map((workout, index) => (
                      <div key={index} className="bg-gray-700 rounded-lg p-4">
                        <h3 className="font-semibold mb-3 text-lg">{workout}</h3>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Weight (lbs)</label>
                            <input
                              type="number"
                              value={workoutInputs[index]?.weight || ''}
                              onChange={(e) => handleInputChange(index, 'weight', e.target.value)}
                              placeholder="0"
                              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Sets</label>
                            <input
                              type="number"
                              value={workoutInputs[index]?.sets || ''}
                              onChange={(e) => handleInputChange(index, 'sets', e.target.value)}
                              placeholder="0"
                              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Reps</label>
                            <input
                              type="number"
                              value={workoutInputs[index]?.reps || ''}
                              onChange={(e) => handleInputChange(index, 'reps', e.target.value)}
                              placeholder="0"
                              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={endSession}
                      disabled={loading}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Saving...' : 'End Session & Save'}
                    </button>
                    <button
                      onClick={cancelSession}
                      disabled={loading}
                      className="flex-1 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Run Mode */}
          {mode === 'run' && (
            <>
              {!showRunForm ? (
                <>
                  <div className="mb-6 flex justify-end">
                    <button
                      onClick={startNewRunSession}
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 shadow-lg"
                    >
                      + New Run Session
                    </button>
                  </div>

                  <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-700">
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Session</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Distance (km)</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Duration (min)</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Pace (min/km)</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Cadence (spm)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loading && runSessions.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                                Loading sessions...
                              </td>
                            </tr>
                          ) : runSessions.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                                No run sessions yet. Start tracking your runs!
                              </td>
                            </tr>
                          ) : (
                            runSessions.map((session, index) => (
                              <tr key={index} className="border-t border-gray-700 hover:bg-gray-700 hover:bg-opacity-30 transition">
                                <td className="px-6 py-4 text-sm">{session[0] || '-'}</td>
                                <td className="px-6 py-4 text-sm">{session[1] || '-'}</td>
                                <td className="px-6 py-4 text-sm">{session[2] || '-'}</td>
                                <td className="px-6 py-4 text-sm">{session[3] || '-'}</td>
                                <td className="px-6 py-4 text-sm">{session[4] || '-'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-gray-800 rounded-lg shadow-xl p-8">
                  <h2 className="text-2xl font-semibold mb-6">New Run Session</h2>
                  
                  <div className="space-y-4 mb-8">
                    <div>
                      <label className="block text-sm font-medium mb-2">Session Name</label>
                      <input
                        type="text"
                        value={runData.session}
                        onChange={(e) => setRunData({ ...runData, session: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
                        placeholder="e.g., Oct 28, 2025, 10:30 AM"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Distance</label>
                        <input
                          type="text"
                          value={runData.distance}
                          onChange={(e) => setRunData({ ...runData, distance: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
                          placeholder="e.g., 5 km or 3.1 miles"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Duration</label>
                        <input
                          type="text"
                          value={runData.duration}
                          onChange={(e) => setRunData({ ...runData, duration: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
                          placeholder="e.g., 25:30 or 25 min 30 sec"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Pace</label>
                        <input
                          type="text"
                          value={runData.pace}
                          onChange={(e) => setRunData({ ...runData, pace: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
                          placeholder="e.g., 5:06/km or 8:12/mile"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Cadence</label>
                        <input
                          type="text"
                          value={runData.cadence}
                          onChange={(e) => setRunData({ ...runData, cadence: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
                          placeholder="e.g., 170 spm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={saveRunSession}
                      disabled={loading}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 disabled:cursor-not-allowed shadow-lg"
                    >
                      {loading ? 'Saving...' : 'Save Session'}
                    </button>
                    <button
                      onClick={cancelRunSession}
                      disabled={loading}
                      className="flex-1 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 disabled:cursor-not-allowed shadow-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
