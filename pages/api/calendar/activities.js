import { getCalendarActivities } from '../../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const activities = await getCalendarActivities();
    res.status(200).json(activities);
  } catch (error) {
    console.error('Error in calendar activities API:', error);
    res.status(500).json({ error: 'Failed to fetch activities', details: error.message });
  }
}

