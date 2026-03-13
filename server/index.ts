import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import transcriptionsRouter from './routes/transcriptions';
import summariesRouter from './routes/summaries';
import profilesRouter from './routes/profiles';
import tokenLogsRouter from './routes/tokenLogs';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/user-settings', usersRouter);
app.use('/api/transcriptions', transcriptionsRouter);
app.use('/api/summaries', summariesRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/token-logs', tokenLogsRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
