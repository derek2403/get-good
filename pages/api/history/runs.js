import { getRunStats } from '../../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const runStats = await getRunStats();
    res.status(200).json(runStats);
  } catch (error) {
    console.error('Error in run stats API:', error);
    res.status(500).json({ error: 'Failed to fetch run stats', details: error.message });
  }
}

