import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { paymentSetupGuard } from './core/payment-setup.guard';
import { adminAuthGuard } from './core/admin-auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'signup', pathMatch: 'full' },

  // Public auth routes
  {
    path: 'signup',
    loadComponent: () => import('./pages/signup/signup').then(m => m.SignupComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent)
  },

  // Payment setup — requires auth but NOT payment setup (it IS the setup)
  {
    path: 'setup-payment',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/setup-payment/setup-payment').then(m => m.SetupPaymentComponent)
  },

  // Protected routes — require auth + payment setup
  {
    path: 'dashboard',
    canActivate: [authGuard, paymentSetupGuard],
    loadComponent: () => import('./pages/user-dashboard/user-dashboard').then(m => m.UserDashboardComponent)
  },
  {
    path: 'browse',
    canActivate: [authGuard, paymentSetupGuard],
    loadComponent: () => import('./pages/browse-committees/browse-committees').then(m => m.BrowseCommitteesComponent)
  },
  {
    path: 'my-committees',
    canActivate: [authGuard, paymentSetupGuard],
    loadComponent: () => import('./pages/my-committees/my-committees').then(m => m.MyCommitteesComponent)
  },
  {
    path: 'shared-groups',
    canActivate: [authGuard, paymentSetupGuard],
    loadComponent: () => import('./pages/shared-group/shared-group').then(m => m.SharedGroupComponent)
  },
  {
    path: 'payments',
    canActivate: [authGuard, paymentSetupGuard],
    loadComponent: () => import('./pages/payments/payments').then(m => m.PaymentsComponent)
  },
  {
    path: 'create-committee',
    canActivate: [authGuard, paymentSetupGuard],
    loadComponent: () => import('./pages/create-committee/create-committee').then(m => m.CreateCommitteeComponent)
  },
  {
    path: 'committee/:id',
    canActivate: [authGuard, paymentSetupGuard],
    loadComponent: () => import('./pages/committee-detail/committee-detail').then(m => m.CommitteeDetailComponent)
  },
  {
    path: 'join-requests',
    canActivate: [authGuard, paymentSetupGuard],
    loadComponent: () => import('./pages/join-requests/join-requests').then(m => m.JoinRequestsComponent)
  },
  {
    path: 'user/:id',
    canActivate: [authGuard, paymentSetupGuard],
    loadComponent: () => import('./pages/user-profile-view/user-profile-view').then(m => m.UserProfileViewComponent)
  },
  {
    path: 'profile/:id',
    canActivate: [authGuard, paymentSetupGuard],
    loadComponent: () => import('./pages/public-user-profile/public-user-profile').then(m => m.PublicUserProfileComponent)
  },
  {
    path: 'profile',
    canActivate: [authGuard, paymentSetupGuard],
    loadComponent: () => import('./pages/public-user-profile/public-user-profile').then(m => m.PublicUserProfileComponent)
  },

  // ── Admin routes ──────────────────────────────────────────────────────
  {
    path: 'admin/login',
    loadComponent: () => import('./pages/admin/admin-login/admin-login').then(m => m.AdminLoginComponent)
  },
  {
    path: 'admin',
    canActivate: [adminAuthGuard],
    loadComponent: () => import('./pages/admin/admin-dashboard/admin-dashboard').then(m => m.AdminDashboardComponent)
  },
  {
    path: 'admin/users',
    canActivate: [adminAuthGuard],
    loadComponent: () => import('./pages/admin/admin-users/admin-users').then(m => m.AdminUsersComponent)
  },
  {
    path: 'admin/committees',
    canActivate: [adminAuthGuard],
    loadComponent: () => import('./pages/admin/admin-committees/admin-committees').then(m => m.AdminCommitteesComponent)
  },
  {
    path: 'admin/reports',
    canActivate: [adminAuthGuard],
    loadComponent: () => import('./pages/admin/admin-reports/admin-reports').then(m => m.AdminReportsComponent)
  },

  { path: '**', redirectTo: 'signup' }
];
