import { Routes } from '@angular/router';
import { AppShellComponent } from './core/layout/app-shell.component';

export const routes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'boards',
      },
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
