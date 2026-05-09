import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuthService } from './admin-auth.service';

/** Redirects to /admin/login if the admin session is not active. */
export const adminAuthGuard: CanActivateFn = () => {
  const adminAuth = inject(AdminAuthService);
  const router    = inject(Router);

  if (adminAuth.isLoggedIn()) return true;
  return router.createUrlTree(['/admin/login']);
};
