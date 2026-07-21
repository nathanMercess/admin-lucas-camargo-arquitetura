import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { Observable } from 'rxjs';

import { ContentEditorComponent } from '../content-editor.component';

export const unsavedContentGuard: CanDeactivateFn<ContentEditorComponent> = (component) => {
  if (!component.hasUnsavedChanges())
    return true;

  const confirmationService = inject(ConfirmationService);

  return new Observable<boolean>((subscriber) => {
    confirmationService.confirm({
      header: $localize`:@@admin.content.leaveTitle:Sair sem salvar?`,
      message: $localize`:@@admin.content.leaveMessage:As alterações pendentes serão perdidas.`,
      acceptLabel: $localize`:@@admin.content.leaveAccept:Sair sem salvar`,
      rejectLabel: $localize`:@@admin.content.leaveReject:Continuar editando`,
      accept: () => {
        subscriber.next(true);
        subscriber.complete();
      },
      reject: () => {
        subscriber.next(false);
        subscriber.complete();
      },
    });
  });
};
