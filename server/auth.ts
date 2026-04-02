import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import sql from './db';

function getJwtSecret(): string {
  const secret = process.env.API_JWT_SECRET;
  if (!secret) {
    throw new Error(
      'FATAL: API_JWT_SECRET environment variable is required. ' +
      'Generate one with: openssl rand -base64 32'
    );
  }
  return secret;
}
const JWT_SECRET: string = getJwtSecret();

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export type WorkflowGroup = 'reporter' | 'specialist' | 'officer';

export type Feature =
  | 'transcription'
  | 'summary'
  | 'mindmap'
  | 'export_pdf'
  | 'export_docx'
  | 'email'
  | 'diagram';

export const FREE_FEATURES: Feature[] = ['transcription', 'summary'];
export const ALL_FEATURES: Feature[] = ['transcription', 'summary', 'mindmap', 'export_pdf', 'export_docx', 'email', 'diagram'];

export interface AuthUser {
  userId: string;
  email: string;
  role: string; // 'free' | 'admin'
  plans: string[]; // ['reporter', 'specialist', 'officer']
  features: Feature[];
}

type CachedProfile = {
  role: string;
  plans: string[];
  features: Feature[];
  expiresAt: number;
};

const PROFILE_CACHE_TTL_MS = 30_000;
const profileCache = new Map<string, CachedProfile>();

function getCachedProfile(userId: string): CachedProfile | null {
  const cached = profileCache.get(userId);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    profileCache.delete(userId);
    return null;
  }
  return cached;
}

function setCachedProfile(userId: string, role: string, plans: string[], features: Feature[]) {
  profileCache.set(userId, {
    role,
    plans,
    features,
    expiresAt: Date.now() + PROFILE_CACHE_TTL_MS,
  });
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(payload: AuthUser): string {
  const { exp, iat, ...clean } = payload as AuthUser & { exp?: number; iat?: number };
  return jwt.sign(clean, JWT_SECRET, { expiresIn: '1h' });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as unknown as { userId: string; type: string };
    if (payload.type !== 'refresh') return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: 'strict' as const,
  path: '/',
};

export function requireFeature(feature: Feature) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!req.user.features.includes(feature)) {
      res.status(403).json({ error: `Tính năng "${feature}" không có trong gói của bạn` });
      return;
    }
    next();
  };
}

// Exported for payment IPN handlers to invalidate stale profile cache after role upgrade.
// Call this immediately after updating profiles.role in the IPN handler.
export function invalidateProfileCache(userId: string): void {
  profileCache.delete(userId);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.session;
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as unknown as Partial<AuthUser> & Pick<AuthUser, 'userId' | 'email' | 'role'>;
    const tokenUser: AuthUser = {
      ...payload,
      plans: (payload as any).plans ?? (payload as any).workflowGroups ?? [],
      features: payload.features ?? FREE_FEATURES,
    } as AuthUser;

    const cachedProfile = getCachedProfile(tokenUser.userId);
    if (cachedProfile) {
      req.user = {
        ...tokenUser,
        role: cachedProfile.role,
        plans: cachedProfile.plans,
        features: cachedProfile.features,
      };
      next();
      return;
    }

    try {
      const [profile] = await sql`
        SELECT role, workflow_groups, features
        FROM public.profiles
        WHERE user_id = ${tokenUser.userId}
      `;
      if (profile) {
        const role = profile.role ?? tokenUser.role;
        const plans = profile.workflow_groups ?? tokenUser.plans;
        const features = profile.features?.length ? profile.features : tokenUser.features;
        setCachedProfile(tokenUser.userId, role, plans, features);
        req.user = {
          ...tokenUser,
          role,
          plans,
          features,
        };
      } else {
        req.user = tokenUser;
      }
    } catch {
      // Fallback to token payload if DB is temporarily unavailable.
      req.user = tokenUser;
    }

    next();
  } catch {
    res.status(401).json({ error: 'Token khong hop le hoac da het han' });
  }
}
