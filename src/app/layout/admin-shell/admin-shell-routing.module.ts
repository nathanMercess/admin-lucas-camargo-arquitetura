import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AdminShellComponent } from './admin-shell.component';

const routes: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('../../features/dashboard/dashboard.module').then(
            (module) => module.DashboardModule,
          ),
      },
      {
        path: 'content',
        loadChildren: () =>
          import('../../features/content/content.module').then((module) => module.ContentModule),
      },
      {
        path: 'projects',
        loadChildren: () =>
          import('../../features/projects/projects.module').then((module) => module.ProjectsModule),
      },
      {
        path: 'media',
        loadChildren: () =>
          import('../../features/media/media.module').then((module) => module.MediaModule),
      },
      {
        path: 'publications',
        loadChildren: () =>
          import('../../features/publications/publications.module').then(
            (module) => module.PublicationsModule,
          ),
      },
      {
        path: 'audit',
        loadChildren: () =>
          import('../../features/audit/audit.module').then((module) => module.AuditModule),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminShellRoutingModule {}
