import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import sql from './db';

const JWT_SECRET = process.env.API_JWT_SECRET ?? 'dev-secret-change-me';

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
  role: string;
  workflowGroups: WorkflowGroup[];
  activeWorkflowGroup: WorkflowGroup;
  features: Feature[];
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
  return jwt.sign(clean, JWT_SECRET, { expiresIn: '7d' });
}

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

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as Partial<AuthUser> & Pick<AuthUser, 'userId' | 'email' | 'role'>;
    const tokenUser: AuthUser = {
      ...payload,
      workflowGroups: payload.workflowGroups ?? [],
      activeWorkflowGroup: payload.activeWorkflowGroup ?? ('' as WorkflowGroup),
      features: payload.features ?? FREE_FEATURES,
    } as AuthUser;

    try {
      const [profile] = await sql`
        SELECT role, workflow_groups, active_workflow_group, features
        FROM public.profiles
        WHERE user_id = ${tokenUser.userId}
      `;
      if (profile) {
        req.user = {
          ...tokenUser,
          role: profile.role ?? tokenUser.role,
          workflowGroups: profile.workflow_groups ?? tokenUser.workflowGroups,
          activeWorkflowGroup: profile.active_workflow_group ?? tokenUser.activeWorkflowGroup,
          features: profile.features?.length ? profile.features : tokenUser.features,
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
