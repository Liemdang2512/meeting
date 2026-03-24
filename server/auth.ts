import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.API_JWT_SECRET ?? 'dev-secret-change-me';

export type WorkflowGroup = 'reporter' | 'specialist' | 'officer';

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  workflowGroups: WorkflowGroup[];
  activeWorkflowGroup: WorkflowGroup;
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
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as Partial<AuthUser> & Pick<AuthUser, 'userId' | 'email' | 'role'>;
    req.user = {
      ...payload,
      workflowGroups: payload.workflowGroups ?? ['specialist'],
      activeWorkflowGroup: payload.activeWorkflowGroup ?? 'specialist',
    } as AuthUser;
    next();
  } catch {
    res.status(401).json({ error: 'Token khong hop le hoac da het han' });
  }
}
