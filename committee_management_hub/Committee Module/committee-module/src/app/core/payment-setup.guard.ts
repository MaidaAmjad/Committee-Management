import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { PaymentMethodService } from './payment-method.service';

/**
 * Redirects to /setup-payment if the user hasn't completed payment setup.
 * Used on routes that require payment details (join, create, payments).
 */
export const paymentSetupGuard: CanActivateFn = async () => {
  const auth    = inject(AuthService);
  const payment = inject(PaymentMethodService);
  const router  = inject(Router);

  await auth.ready;
  if (!auth.isLoggedIn) return router.createUrlTree(['/login']);

  const complete = await payment.isSetupComplete();
  if (!complete) return router.createUrlTree(['/setup-payment']);

  return true;
};
