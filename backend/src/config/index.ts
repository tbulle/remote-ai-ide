import { config } from 'dotenv';
config();

export const appConfig = {
  port: parseInt(process.env.PORT || '3002', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  authTokens: (process.env.AUTH_TOKENS || '').split(',').filter(Boolean),
  whisperModel: process.env.WHISPER_MODEL || 'base',
  maxSessions: parseInt(process.env.MAX_SESSIONS || '10', 10),
  sessionTimeoutMs: parseInt(process.env.SESSION_TIMEOUT_MS || '3600000', 10),
};
