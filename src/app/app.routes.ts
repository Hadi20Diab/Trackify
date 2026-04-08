import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { AppShellComponent } from './core/layout/app-shell.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/landing/pages/landing-page.component').then(
        (module) => module.LandingPageComponent,
      ),
  },
  {
    path: 'features',
    loadComponent: () =>
      import('./features/landing/pages/features-page.component').then(
        (module) => module.FeaturesPageComponent,
      ),
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./features/landing/pages/about-page.component').then(
        (module) => module.AboutPageComponent,
      ),
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./features/landing/pages/contact-page.component').then(
        (module) => module.ContactPageComponent,
      ),
  },
  {
    path: 'auth/login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/login-page.component').then((module) => module.LoginPageComponent),
  },
  {
    path: 'auth/register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/register-page.component').then((module) => module.RegisterPageComponent),
  },
  {
    path: 'auth/forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/forgot-password-page.component').then(
        (module) => module.ForgotPasswordPageComponent,
      ),
  },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'boards',
        loadComponent: () =>
          import('./features/boards/pages/boards-page.component').then((module) => module.BoardsPageComponent),
      },
      {
        path: 'board',
        loadComponent: () =>
          import('./features/boards/pages/board-entry-page.component').then(
            (module) => module.BoardEntryPageComponent,
          ),
      },
      {
        path: 'board/:boardId',
        loadComponent: () =>
          import('./features/boards/pages/board-detail-page.component').then(
            (module) => module.BoardDetailPageComponent,
          ),
      },
      {
        path: '**',
        redirectTo: 'boards',
      },
    ],
  },
];
