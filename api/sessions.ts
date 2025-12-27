import type { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory store (for demo - use a database in production)
const sessions = new Map<string, {
  id: string;
  username: string;
  createdAt: string;
  currentRound: number;
  roundsCompleted: boolean[];
  roundScores: number[];
  isComplete: boolean;
}>();

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method } = req;

  switch (method) {
    case 'GET': {
      // Get session by username
      const { username } = req.query;
      
      if (!username || typeof username !== 'string') {
        return res.status(400).json({ error: 'Username is required' });
      }

      const sessionId = `user_${username.toLowerCase().replace(/\s+/g, '_')}`;
      const session = sessions.get(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      return res.status(200).json(session);
    }

    case 'POST': {
      // Create new session
      const { username } = req.body;

      if (!username || typeof username !== 'string' || username.trim().length < 2) {
        return res.status(400).json({ error: 'Valid username is required (min 2 chars)' });
      }

      const sessionId = `user_${username.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
      
      const session = {
        id: sessionId,
        username: username.trim(),
        createdAt: new Date().toISOString(),
        currentRound: 0,
        roundsCompleted: [false, false, false, false, false, false],
        roundScores: [0, 0, 0, 0, 0, 0],
        isComplete: false,
      };

      sessions.set(sessionId, session);

      return res.status(201).json(session);
    }

    case 'PUT': {
      // Update session (complete round)
      const { sessionId, roundIndex, score } = req.body;

      if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'Session ID is required' });
      }

      const session = sessions.get(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (typeof roundIndex === 'number' && typeof score === 'number') {
        session.roundsCompleted[roundIndex] = true;
        session.roundScores[roundIndex] = score;
        session.currentRound = roundIndex + 1;
        session.isComplete = session.roundsCompleted.every(r => r);
      }

      sessions.set(sessionId, session);

      return res.status(200).json(session);
    }

    case 'DELETE': {
      // Delete session
      const { sessionId } = req.query;

      if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'Session ID is required' });
      }

      sessions.delete(sessionId);

      return res.status(204).end();
    }

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
      return res.status(405).json({ error: `Method ${method} not allowed` });
  }
}

