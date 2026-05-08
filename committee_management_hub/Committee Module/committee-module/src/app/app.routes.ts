import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'signup',
    pathMatch: 'full'
  },
  {
    path: 'signup',
    loadComponent: () => import('./pages/signup/signup').then(m => m.SignupComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'create-committee',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/create-committee/create-committee').then(m => m.CreateCommitteeComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/user-dashboard/user-dashboard').then(m => m.UserDashboardComponent)
  },
  {
    path: 'browse',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/browse-committees/browse-committees').then(m => m.BrowseCommitteesComponent)
  },
  {
    path: 'my-committees',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/my-committees/my-committees').then(m => m.MyCommitteesComponent)
  },
  {
    path: 'profile/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/public-user-profile/public-user-profile').then(m => m.PublicUserProfileComponent)
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/public-user-profile/public-user-profile').then(m => m.PublicUserProfileComponent)
  },
  {
    path: '**',
    redirectTo: 'signup'
  }
];
