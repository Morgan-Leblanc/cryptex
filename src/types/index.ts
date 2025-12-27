export interface User {
  id: string;
  username: string;
  createdAt: string;
  currentRound: number;
  completedRounds: number[];
  totalScore: number;
  avatar?: string; // URL du GIF Giphy
}

export interface GameSession {
  userId: string;
  username: string;
  currentRound: number;
  roundsCompleted: boolean[];
  roundScores: number[];
  startedAt: string;
  isComplete: boolean;
}

export interface Round {
  id: number;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  wheelCount: number;
  timeLimit?: number; // in seconds
}

export interface CryptexState {
  wheels: string[];
  solution: string;
  hints: string[];
  hintsUsed: number;
}

export type AppView = 'code' | 'login' | 'game' | 'victory' | 'admin' | 'waiting';
