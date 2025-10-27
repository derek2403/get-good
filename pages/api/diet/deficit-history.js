import { getDeficitHistory, updateDeficit } from '../../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Refresh today's deficit before returning history
    await updateDeficit();

    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 30;
    const history = await getDeficitHistory(Number.isFinite(limit) ? limit : 30);

    if (!history || history.length === 0) {
      return res.status(200).json({ history: [] });
    }

    const deficits = history.map((entry) => entry.deficit);
    const total = deficits.reduce((sum, value) => sum + value, 0);
    const average = deficits.length > 0 ? total / deficits.length : 0;
    const max = Math.max(...deficits);
    const min = Math.min(...deficits);

    return res.status(200).json({
      history,
      stats: {
        average,
        max,
        min,
      },
    });
  } catch (error) {
    console.error('Error fetching deficit history:', error);
    res.status(500).json({ error: 'Failed to fetch deficit history', details: error.message });
  }
}
