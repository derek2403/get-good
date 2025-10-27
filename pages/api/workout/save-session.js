import { saveWorkoutSession } from '../../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sheetName, sessionName, workoutData, existingColumn } = req.body;

  if (!sheetName || !sessionName || !workoutData) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await saveWorkoutSession(sheetName, sessionName, workoutData, existingColumn);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in save-session API:', error);
    res.status(500).json({ error: 'Failed to save session', details: error.message });
  }
}

