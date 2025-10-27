import { getRunSessions, saveRunSession } from '../../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Get all run sessions
    try {
      const data = await getRunSessions();
      res.status(200).json(data);
    } catch (error) {
      console.error('Error in get run sessions API:', error);
      res.status(500).json({ error: 'Failed to fetch run sessions', details: error.message });
    }
  } else if (req.method === 'POST') {
    // Save a new run session
    const { session, distance, duration, pace, cadence } = req.body;

    if (!session) {
      return res.status(400).json({ error: 'Session name is required' });
    }

    try {
      const result = await saveRunSession({
        session,
        distance: distance || '',
        duration: duration || '',
        pace: pace || '',
        cadence: cadence || '',
      });
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in save run session API:', error);
      res.status(500).json({ error: 'Failed to save run session', details: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

