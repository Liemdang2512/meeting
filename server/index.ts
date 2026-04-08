import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import transcriptionsRouter from './routes/transcriptions';
import summariesRouter from './routes/summaries';
import profilesRouter from './routes/profiles';
import tokenLogsRouter from './routes/tokenLogs';
import adminRouter from './routes/admin';
import quotaRouter from './routes/quota';
import walletRouter from './routes/wallet';
import emailRouter from './routes/email';
import geminiRouter from './routes/gemini';
import { paymentsRouter } from './routes/payments/index';
// import { vnpayRouter } from './routes/payments/vnpay';
// import { momoRouter } from './routes/payments/momo';
import { vietqrRouter } from './routes/payments/vietqr';
import { sepayRouter } from './routes/payments/sepay';

const app = express();
const PORT = process.env.PORT ?? 3001;

// Trust Railway / Vercel reverse proxy so rate-limiter reads the correct client IP
app.set('trust proxy', 1);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:3003'];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api/user-settings', usersRouter);
app.use('/api/transcriptions', transcriptionsRouter);
app.use('/api/summaries', summariesRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/token-logs', tokenLogsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/quota', quotaRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/email', emailRouter);
app.use('/api/gemini', geminiRouter);
app.use('/api/payments', paymentsRouter);
// app.use('/api/payments/vnpay', vnpayRouter);
// app.use('/api/payments/momo', momoRouter);
app.use('/api/payments/vietqr', vietqrRouter);
app.use('/api/payments/sepay', sepayRouter);

// Keep root path healthy for platform health checks that probe "/".
app.get('/', (_req, res) => res.status(200).send('ok'));
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
