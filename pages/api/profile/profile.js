import { getProfileData, saveWeightEntry } from '../../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Get profile data and weight history
    try {
      const data = await getProfileData();
      res.status(200).json(data);
    } catch (error) {
      console.error('Error in get profile data API:', error);
      res.status(500).json({ error: 'Failed to fetch profile data', details: error.message });
    }
  } else if (req.method === 'POST') {
    // Save a new weight entry
    const { date, weight, tdee } = req.body;

    if (!date || !weight) {
      return res.status(400).json({ error: 'Date and weight are required' });
    }

    try {
      const result = await saveWeightEntry(date, weight, tdee || '');
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in save weight entry API:', error);
      res.status(500).json({ error: 'Failed to save weight entry', details: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

