import { getTodaysMeals, addMeal } from '../../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const data = await getTodaysMeals();
      res.status(200).json(data);
    } catch (error) {
      console.error('Error in food GET API:', error);
      res.status(500).json({ error: 'Failed to fetch meals', details: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, calories, protein, carbs, fat } = req.body;

      if (!name || calories === undefined) {
        return res.status(400).json({ error: 'Missing required fields: name and calories' });
      }

      const result = await addMeal({
        name,
        calories: calories || 0,
        protein: protein || 0,
        carbs: carbs || 0,
        fat: fat || 0,
      });

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in food POST API:', error);
      res.status(500).json({ error: 'Failed to add meal', details: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

