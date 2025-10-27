import { google } from 'googleapis';

export async function getGoogleSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}

export async function getWorkouts(sheetName) {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    // Get workout names from column A
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:A100`,
    });

    const workouts = response.data.values?.map((row) => row[0]).filter(Boolean) || [];
    
    // Get all session data (column B onwards)
    const sessionResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!B1:ZZ100`,
    });

    const sessionData = sessionResponse.data.values || [];
    
    return {
      workouts,
      sessionData,
    };
  } catch (error) {
    console.error('Error fetching workouts:', error);
    throw error;
  }
}

export async function saveWorkoutSession(sheetName, sessionName, workoutData, existingColumn = null) {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    let targetColumn = existingColumn;

    // If no existing column, find the column with matching session name or create new
    if (!targetColumn) {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!B1:ZZ1`,
      });

      const headers = response.data.values?.[0] || [];
      
      // Look for existing column with same session name
      const existingIndex = headers.findIndex(header => header === sessionName);
      
      if (existingIndex !== -1) {
        // Use existing column
        targetColumn = String.fromCharCode(66 + existingIndex);
      } else {
        // Create new column
        targetColumn = String.fromCharCode(66 + headers.length);
      }
    }
    
    // Prepare the data to write
    const values = [
      [sessionName], // Session name in row 1
      ...workoutData, // Workout data in subsequent rows
    ];

    // Write the data (use RAW to prevent date auto-formatting)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!${targetColumn}1:${targetColumn}${values.length}`,
      valueInputOption: 'RAW',
      resource: {
        values,
      },
    });

    return { success: true, column: targetColumn };
  } catch (error) {
    console.error('Error saving workout session:', error);
    throw error;
  }
}

export async function getAllSheetNames() {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheetNames = response.data.sheets.map((sheet) => sheet.properties.title);
    return sheetNames;
  } catch (error) {
    console.error('Error fetching sheet names:', error);
    throw error;
  }
}

// Run tracking functions (row-based storage)
export async function getRunSessions() {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = 'Run';

  try {
    // Get all run data (headers and sessions)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:E1000`,
    });

    const rows = response.data.values || [];
    
    if (rows.length === 0) {
      return { headers: [], sessions: [] };
    }

    // First row is headers
    const headers = rows[0];
    const sessions = rows.slice(1);

    return {
      headers,
      sessions,
    };
  } catch (error) {
    console.error('Error fetching run sessions:', error);
    throw error;
  }
}

export async function saveRunSession(sessionData) {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = 'Run';

  try {
    // Find the next available row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`,
    });

    const rows = response.data.values || [];
    const nextRow = rows.length + 1;

    // Prepare data: [Session, Distance, Duration, Pace, Cadence]
    const values = [[
      sessionData.session,
      sessionData.distance,
      sessionData.duration,
      sessionData.pace,
      sessionData.cadence,
    ]];

    // Write the data (use RAW to prevent auto-formatting)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A${nextRow}:E${nextRow}`,
      valueInputOption: 'RAW',
      resource: {
        values,
      },
    });

    return { success: true, row: nextRow };
  } catch (error) {
    console.error('Error saving run session:', error);
    throw error;
  }
}

// Profile tracking functions
export async function getProfileData() {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = 'Profile';

  try {
    // Get profile data: Name, DOB, Goal, Height
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:F4`,
    });

    const rows = response.data.values || [];
    
    // Parse the data
    const profile = {
      name: rows[0]?.[1] || '',
      dob: rows[1]?.[1] || '',
      goal: rows[2]?.[1] || '',
      height: rows[3]?.[1] || '',
    };

    // Get weight history (columns D, E, F)
    const weightResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!D1:F1000`,
    });

    const weightRows = weightResponse.data.values || [];
    const weightHistory = weightRows.slice(1).filter(row => row[0]); // Skip header, filter empty rows

    return {
      profile,
      weightHistory,
    };
  } catch (error) {
    console.error('Error fetching profile data:', error);
    throw error;
  }
}

export async function saveWeightEntry(date, weight, tdee) {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = 'Profile';

  try {
    // Find the next available row in columns D, E, F
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!D:D`,
    });

    const rows = response.data.values || [];
    const nextRow = rows.length + 1;

    // Prepare data: [Date, Weight, TDEE]
    const values = [[date, weight, tdee]];

    // Write the data (use RAW to prevent auto-formatting)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!D${nextRow}:F${nextRow}`,
      valueInputOption: 'RAW',
      resource: {
        values,
      },
    });

    return { success: true, row: nextRow };
  } catch (error) {
    console.error('Error saving weight entry:', error);
    throw error;
  }
}

// Get workout sheets by category
export async function getWorkoutsByCategory(category) {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    // Get all sheet names
    const sheetNamesResponse = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const allSheets = sheetNamesResponse.data.sheets.map((sheet) => sheet.properties.title);
    const categorySheets = allSheets.filter(name => 
      name.toLowerCase().includes(category.toLowerCase())
    );

    return categorySheets;
  } catch (error) {
    console.error('Error fetching workout sheets:', error);
    throw error;
  }
}

// Get detailed exercise statistics for a specific workout sheet
export async function getWorkoutExerciseStats(sheetName) {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    // Get exercise names from column A
    const exerciseResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:A100`,
    });

    const exercises = exerciseResponse.data.values?.map((row) => row[0]).filter(Boolean) || [];

    // Get all session data
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!B2:ZZ100`,
    });

    const sessionData = dataResponse.data.values || [];

    // Calculate stats for each exercise
    const exerciseStats = exercises.map((exerciseName, exerciseIndex) => {
      const allData = [];
      
      // sessionData is an array of rows, where each row corresponds to an exercise
      // Each row contains cells from different sessions (columns B, C, D, etc.)
      const exerciseRow = sessionData[exerciseIndex];
      
      if (exerciseRow && Array.isArray(exerciseRow)) {
        exerciseRow.forEach(cell => {
          if (cell && typeof cell === 'string' && cell.trim() !== '') {
            const parts = cell.split('/');
            if (parts.length === 3) {
              const weight = parseFloat(parts[0]) || 0;
              const sets = parseFloat(parts[1]) || 0;
              const reps = parseFloat(parts[2]) || 0;
              if (weight > 0 || sets > 0 || reps > 0) {
                allData.push({ weight, sets, reps });
              }
            }
          }
        });
      }

      if (allData.length === 0) {
        return {
          exercise: exerciseName,
          maxWeight: 0,
          minWeight: 0,
          avgWeight: 0,
          maxSets: 0,
          minSets: 0,
          avgSets: 0,
          maxReps: 0,
          minReps: 0,
          avgReps: 0,
          totalSessions: 0
        };
      }

      const weights = allData.map(d => d.weight).filter(w => w > 0);
      const sets = allData.map(d => d.sets).filter(s => s > 0);
      const reps = allData.map(d => d.reps).filter(r => r > 0);

      return {
        exercise: exerciseName,
        maxWeight: weights.length > 0 ? Math.max(...weights) : 0,
        minWeight: weights.length > 0 ? Math.min(...weights) : 0,
        avgWeight: weights.length > 0 ? Math.round(weights.reduce((a, b) => a + b, 0) / weights.length) : 0,
        maxSets: sets.length > 0 ? Math.max(...sets) : 0,
        minSets: sets.length > 0 ? Math.min(...sets) : 0,
        avgSets: sets.length > 0 ? Math.round(sets.reduce((a, b) => a + b, 0) / sets.length) : 0,
        maxReps: reps.length > 0 ? Math.max(...reps) : 0,
        minReps: reps.length > 0 ? Math.min(...reps) : 0,
        avgReps: reps.length > 0 ? Math.round(reps.reduce((a, b) => a + b, 0) / reps.length) : 0,
        totalSessions: allData.length
      };
    });

    return exerciseStats;
  } catch (error) {
    console.error('Error fetching exercise stats:', error);
    throw error;
  }
}

// Get run statistics
export async function getRunStats() {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = 'Run';

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:E1000`,
    });

    const runs = response.data.values || [];
    
    if (runs.length === 0) {
      return {
        totalDistance: 0,
        totalRuns: 0,
        avgPace: 'N/A',
        avgCadence: 'N/A'
      };
    }

    // Calculate statistics
    const distances = [];
    const paces = [];
    const cadences = [];

    runs.forEach(run => {
      // Distance (column B, index 1)
      const distance = parseFloat(run[1]);
      if (!isNaN(distance)) distances.push(distance);

      // Pace (column D, index 3) - extract numeric part
      const pace = run[3];
      if (pace) {
        const paceMatch = pace.match(/[\d.]+/);
        if (paceMatch) paces.push(parseFloat(paceMatch[0]));
      }

      // Cadence (column E, index 4) - extract numeric part
      const cadence = run[4];
      if (cadence) {
        const cadenceMatch = cadence.match(/[\d.]+/);
        if (cadenceMatch) cadences.push(parseFloat(cadenceMatch[0]));
      }
    });

    return {
      totalDistance: distances.reduce((a, b) => a + b, 0).toFixed(1),
      totalRuns: runs.length,
      avgPace: paces.length > 0 ? (paces.reduce((a, b) => a + b, 0) / paces.length).toFixed(2) : 'N/A',
      avgCadence: cadences.length > 0 ? Math.round(cadences.reduce((a, b) => a + b, 0) / cadences.length) : 'N/A'
    };
  } catch (error) {
    console.error('Error fetching run stats:', error);
    throw error;
  }
}

// Get calendar activities (workout and run dates)
export async function getCalendarActivities() {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    // Get all sheet names
    const sheetNamesResponse = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const allSheets = sheetNamesResponse.data.sheets.map((sheet) => sheet.properties.title);
    const workoutSheets = allSheets.filter(name => 
      !['Run', 'Profile'].includes(name) && 
      (name.toLowerCase().includes('push') || 
       name.toLowerCase().includes('pull') || 
       name.toLowerCase().includes('leg'))
    );

    const workoutDates = [];
    const runDates = [];

    // Fetch workout dates from workout sheets
    for (const sheetName of workoutSheets) {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!B1:ZZ1`,
      });

      const sessions = response.data.values?.[0] || [];
      sessions.forEach(session => {
        if (session && session.trim() !== '') {
          // Parse date from session name (e.g., "Oct 28, 2025, 12:46 AM")
          try {
            const date = new Date(session);
            if (!isNaN(date.getTime())) {
              const dateStr = date.toISOString().split('T')[0];
              if (!workoutDates.includes(dateStr)) {
                workoutDates.push(dateStr);
              }
            }
          } catch (e) {
            // Ignore invalid dates
          }
        }
      });
    }

    // Fetch run dates from Run sheet
    try {
      const runResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Run!A2:A1000',
      });

      const runSessions = runResponse.data.values || [];
      runSessions.forEach(row => {
        if (row[0]) {
          try {
            const date = new Date(row[0]);
            if (!isNaN(date.getTime())) {
              const dateStr = date.toISOString().split('T')[0];
              if (!runDates.includes(dateStr)) {
                runDates.push(dateStr);
              }
            }
          } catch (e) {
            // Ignore invalid dates
          }
        }
      });
    } catch (e) {
      console.log('No Run sheet or error fetching runs');
    }

    return { workoutDates, runDates };
  } catch (error) {
    console.error('Error fetching calendar activities:', error);
    throw error;
  }
}
