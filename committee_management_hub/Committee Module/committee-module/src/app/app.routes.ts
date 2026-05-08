import { Routes } from '@angular/router';

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
    path: 'dashboard',
    loadComponent: () => import('./pages/user-dashboard/user-dashboard').then(m => m.UserDashboardComponent)
  },
  {
    path: 'browse',
    loadComponent: () => import('./pages/browse-committees/browse-committees').then(m => m.BrowseCommitteesComponent)
  },
  {
    path: 'my-committees',
    loadComponent: () => import('./pages/my-committees/my-committees').then(m => m.MyCommitteesComponent)
  },
  {
    path: 'profile/:id',
    loadComponent: () => import('./pages/public-user-profile/public-user-profile').then(m => m.PublicUserProfileComponent)
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/public-user-profile/public-user-profile').then(m => m.PublicUserProfileComponent)
  },
  {
    path: '**',
    redirectTo: 'signup'
  }
];
