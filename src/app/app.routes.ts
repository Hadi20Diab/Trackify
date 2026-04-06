import { Routes } from '@angular/router';
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
    path: '',
    component: AppShellComponent,
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
