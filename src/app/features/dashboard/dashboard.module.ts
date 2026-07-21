import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { TimelineModule } from 'primeng/timeline';

import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardComponent } from './dashboard.component';

@NgModule({
  declarations: [DashboardComponent],
  imports: [
    CommonModule,
    CardModule,
    ProgressBarModule,
    TagModule,
    TimelineModule,
    DashboardRoutingModule,
  ],
})
export class DashboardModule {}
