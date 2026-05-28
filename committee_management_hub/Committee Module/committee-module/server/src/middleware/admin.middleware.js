import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

/** Validates admin portal credentials sent in the request body. */
export function requireAdmin(req, _res, next) {
  const email = (req.body?.adminEmail || req.headers['x-admin-email'] || '').trim().toLowerCase();
  const password = req.body?.adminPassword || req.headers['x-admin-password'] || '';

  if (email === env.adminEmail && password === env.adminPassword) {
    return next();
  }

  next(new AppError('Unauthorized admin request.', 401));
}
