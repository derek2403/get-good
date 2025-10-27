import { getWorkoutsByCategory, getWorkoutExerciseStats } from '../../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { category, sheet } = req.query;

  try {
    // Disable caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    if (sheet) {
      // Get detailed stats for a specific workout sheet
      const exerciseStats = await getWorkoutExerciseStats(sheet);
      console.log('Sending exercise stats:', exerciseStats);
      res.status(200).json({ exerciseStats });
    } else if (category) {
      // Get list of workout sheets for a category
      const sheets = await getWorkoutsByCategory(category);
      res.status(200).json({ sheets });
    } else {
      res.status(400).json({ error: 'Missing category or sheet parameter' });
    }
  } catch (error) {
    console.error('Error in workout history API:', error);
    res.status(500).json({ error: 'Failed to fetch workout data', details: error.message });
  }
}
