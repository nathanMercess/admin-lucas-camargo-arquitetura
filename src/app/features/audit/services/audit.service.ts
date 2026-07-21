import { HttpClient } from '@angular/common/http';
import { Injectable, Signal, inject, signal } from '@angular/core';
import { finalize, take } from 'rxjs';

import { AuditEvent } from '../models/audit-event.model';

const AUDIT_ENDPOINT = '/api/v1/audit-events';

@Injectable()
export class AuditService {
  private readonly httpClient = inject(HttpClient);
  private readonly eventsState = signal<AuditEvent[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  public readonly events: Signal<AuditEvent[]> = this.eventsState.asReadonly();
  public readonly loading: Signal<boolean> = this.loadingState.asReadonly();
  public readonly error: Signal<string | null> = this.errorState.asReadonly();

  public load(): void {
    if (this.loadingState())
      return;

    this.loadingState.set(true);
    this.errorState.set(null);

    this.httpClient
      .get<readonly AuditEvent[]>(AUDIT_ENDPOINT)
      .pipe(
        take(1),
        finalize(() => this.loadingState.set(false)),
      )
      .subscribe({
        next: (events) => this.eventsState.set([...events]),
        error: () => this.errorState.set(
          $localize`:@@admin.audit.loadError:Não foi possível carregar a trilha de auditoria.`,
        ),
      });
  }
}
