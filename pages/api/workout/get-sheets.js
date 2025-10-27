import { getAllSheetNames } from '../../../utils/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sheetNames = await getAllSheetNames();
    res.status(200).json({ sheetNames });
  } catch (error) {
    console.error('Error in get-sheets API:', error);
    res.status(500).json({ error: 'Failed to fetch sheet names', details: error.message });
  }
}

