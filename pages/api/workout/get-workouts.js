import { getWorkouts } from '../../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sheetName } = req.query;

  if (!sheetName) {
    return res.status(400).json({ error: 'Sheet name is required' });
  }

  try {
    const data = await getWorkouts(sheetName);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error in get-workouts API:', error);
    res.status(500).json({ error: 'Failed to fetch workouts', details: error.message });
  }
}

