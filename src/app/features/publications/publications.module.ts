import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';

import { SharedModule } from '@shared/shared.module';

import { PublicationsRoutingModule } from './publications-routing.module';
import { PublicationsComponent } from './publications.component';

@NgModule({
  declarations: [PublicationsComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    ConfirmDialogModule,
    MessageModule,
    SharedModule,
    TableModule,
    PublicationsRoutingModule,
  ],
  providers: [ConfirmationService],
})
export class PublicationsModule {}
