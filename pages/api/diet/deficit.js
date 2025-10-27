import { updateDeficit } from '../../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await updateDeficit();
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in deficit API:', error);
    res.status(500).json({ error: 'Failed to get deficit data', details: error.message });
  }
}

