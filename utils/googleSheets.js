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

export async function saveWorkoutSession(sheetName, sessionName, workoutData) {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    // First, find the next available column (starting from B)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!B1:ZZ1`,
    });

    const headers = response.data.values?.[0] || [];
    const nextColumn = String.fromCharCode(66 + headers.length); // B is 66 in ASCII
    
    // Prepare the data to write
    const values = [
      [sessionName], // Session name in row 1
      ...workoutData, // Workout data in subsequent rows
    ];

    // Write the data (use RAW to prevent date auto-formatting)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!${nextColumn}1:${nextColumn}${values.length}`,
      valueInputOption: 'RAW',
      resource: {
        values,
      },
    });

    return { success: true, column: nextColumn };
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

