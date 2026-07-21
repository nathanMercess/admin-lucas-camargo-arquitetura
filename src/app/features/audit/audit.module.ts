import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { AuditRoutingModule } from './audit-routing.module';
import { AuditComponent } from './audit.component';
import { AuditService } from './services/audit.service';

@NgModule({
  declarations: [AuditComponent],
  imports: [CommonModule, MessageModule, TableModule, TagModule, AuditRoutingModule],
  providers: [AuditService],
})
export class AuditModule {}
