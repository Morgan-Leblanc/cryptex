import type { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory leaderboard (for demo - use a database in production)
const leaderboard: Array<{
  username: string;
  score: number;
  completedAt: string;
}> = [];

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method } = req;

  switch (method) {
    case 'GET': {
      // Get top 10 scores
      const topScores = [...leaderboard]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      return res.status(200).json(topScores);
    }

    case 'POST': {
      // Add new score
      const { username, score } = req.body;

      if (!username || typeof username !== 'string') {
        return res.status(400).json({ error: 'Username is required' });
      }

      if (typeof score !== 'number' || score < 0) {
        return res.status(400).json({ error: 'Valid score is required' });
      }

      const entry = {
        username,
        score,
        completedAt: new Date().toISOString(),
      };

      leaderboard.push(entry);

      // Sort and get rank
      const sorted = [...leaderboard].sort((a, b) => b.score - a.score);
      const rank = sorted.findIndex(e => e.username === username && e.score === score) + 1;

      return res.status(201).json({
        ...entry,
        rank,
        totalPlayers: leaderboard.length,
      });
    }

    default:
      res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
      return res.status(405).json({ error: `Method ${method} not allowed` });
  }
}

