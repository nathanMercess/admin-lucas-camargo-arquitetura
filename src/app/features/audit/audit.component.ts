import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';

import { AuditAction } from './models/audit-action.type';
import { AuditService } from './services/audit.service';

@Component({
  selector: 'app-audit',
  templateUrl: './audit.component.html',
  styleUrl: './audit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AuditComponent implements OnInit {
  protected readonly auditService = inject(AuditService);

  public ngOnInit(): void {
    this.auditService.load();
  }

  protected actionLabel(action: AuditAction): string {
    const labels: Record<AuditAction, string> = {
      'draft.create': $localize`:@@admin.audit.action.draftCreate:Rascunho criado`,
      'draft.save': $localize`:@@admin.audit.action.draftSave:Rascunho salvo`,
      'release.publish': $localize`:@@admin.audit.action.publish:Publicação`,
      'release.rollback': $localize`:@@admin.audit.action.rollback:Restauração`,
      'media.complete': $localize`:@@admin.audit.action.media:Mídia registrada`,
    };

    return labels[action];
  }
}
