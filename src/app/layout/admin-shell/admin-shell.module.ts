import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { AdminShellRoutingModule } from './admin-shell-routing.module';
import { AdminShellComponent } from './admin-shell.component';

@NgModule({
  declarations: [AdminShellComponent],
  imports: [
    CommonModule,
    RouterModule,
    AvatarModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    AdminShellRoutingModule,
  ],
})
export class AdminShellModule {}
