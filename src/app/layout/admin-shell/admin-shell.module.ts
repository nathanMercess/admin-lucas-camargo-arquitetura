import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { TagModule } from 'primeng/tag';

import { AdminShellRoutingModule } from './admin-shell-routing.module';
import { AdminShellComponent } from './admin-shell.component';

@NgModule({
  declarations: [AdminShellComponent],
  imports: [
    CommonModule,
    RouterModule,
    AvatarModule,
    MenuModule,
    TagModule,
    AdminShellRoutingModule,
  ],
})
export class AdminShellModule {}
