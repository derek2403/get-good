import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Workout() {
  const [availableSheets, setAvailableSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [workouts, setWorkouts] = useState([]);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [workoutInputs, setWorkoutInputs] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load available sheets on mount
  useEffect(() => {
    loadSheets();
  }, []);

  const loadSheets = async () => {
    try {
      const response = await fetch('/api/workout/get-sheets');
      const data = await response.json();
      if (data.sheetNames) {
        setAvailableSheets(data.sheetNames);
      }
    } catch (err) {
      setError('Failed to load workout sheets');
      console.error(err);
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

  return (
    <>
      <Head>
        <title>Workout Tracker - Get Good</title>
        <meta name="description" content="Track your workouts" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <h1 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Workout Tracker
          </h1>

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

          {!sessionStarted ? (
            <div className="bg-gray-800 rounded-lg shadow-xl p-8">
              <h2 className="text-2xl font-semibold mb-6">Start New Session</h2>
              
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
        </div>
      </div>
    </>
  );
}

