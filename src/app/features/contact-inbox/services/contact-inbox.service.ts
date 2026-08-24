import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams,
  HttpResponse,
} from '@angular/common/http';
import { Injectable, Signal, inject, signal } from '@angular/core';
import { finalize, take } from 'rxjs';

import { ContactMessageDetail } from '../models/contact-message-detail.model';
import { ContactMessageListResponse } from '../models/contact-message-list-response.model';
import { ContactMessageStatus } from '../models/contact-message-status.type';
import { ContactMessageStatusUpdate } from '../models/contact-message-status-update.model';
import { ContactMessageSummary } from '../models/contact-message-summary.model';

const CONTACT_MESSAGES_ENDPOINT = '/api/v1/contact-messages';

@Injectable()
export class ContactInboxService {
  private readonly httpClient = inject(HttpClient);
  private readonly messagesState = signal<ContactMessageSummary[]>([]);
  private readonly selectedState = signal<ContactMessageDetail | null>(null);
  private readonly selectedEtagState = signal<string | null>(null);
  private readonly nextCursorState = signal<string | null>(null);
  private readonly loadingState = signal(false);
  private readonly detailLoadingState = signal(false);
  private readonly updatingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private activeStatus: ContactMessageStatus | undefined;

  public readonly messages: Signal<ContactMessageSummary[]> = this.messagesState.asReadonly();
  public readonly selected: Signal<ContactMessageDetail | null> = this.selectedState.asReadonly();
  public readonly selectedEtag: Signal<string | null> = this.selectedEtagState.asReadonly();
  public readonly nextCursor: Signal<string | null> = this.nextCursorState.asReadonly();
  public readonly loading: Signal<boolean> = this.loadingState.asReadonly();
  public readonly detailLoading: Signal<boolean> = this.detailLoadingState.asReadonly();
  public readonly updating: Signal<boolean> = this.updatingState.asReadonly();
  public readonly error: Signal<string | null> = this.errorState.asReadonly();

  public load(status?: ContactMessageStatus, append = false): void {
    if (this.loadingState())
      return;

    const cursor = append ? this.nextCursorState() : null;

    if (append && !cursor)
      return;

    this.loadingState.set(true);
    this.errorState.set(null);
    this.activeStatus = status;

    if (!append) {
      this.messagesState.set([]);
      this.nextCursorState.set(null);
    }

    let params = new HttpParams().set('limit', 25);

    if (status)
      params = params.set('status', status);

    if (cursor)
      params = params.set('cursor', cursor);

    this.httpClient.get<ContactMessageListResponse>(CONTACT_MESSAGES_ENDPOINT, { params })
      .pipe(take(1), finalize(() => this.loadingState.set(false)))
      .subscribe({
        next: (response) => {
          const page = [...response.items]
            .sort((first, second) => second.receivedAt.localeCompare(first.receivedAt));

          this.messagesState.update((messages) => append
            ? this.mergeMessages(messages, page)
            : page);
          this.nextCursorState.set(response.nextCursor ?? null);
        },
        error: () => this.errorState.set(
          $localize`:@@admin.contacts.loadError:Não foi possível carregar as mensagens de contato.`,
        ),
      });
  }

  public loadMore(): void {
    this.load(this.activeStatus, true);
  }

  public select(messageId: string): void {
    if (this.detailLoadingState())
      return;

    this.detailLoadingState.set(true);
    this.errorState.set(null);

    this.httpClient.get<ContactMessageDetail>(this.detailEndpoint(messageId), { observe: 'response' })
      .pipe(take(1), finalize(() => this.detailLoadingState.set(false)))
      .subscribe({
        next: (response) => this.receiveDetail(response),
        error: () => this.errorState.set(
          $localize`:@@admin.contacts.detailError:Não foi possível abrir esta mensagem.`,
        ),
      });
  }

  public updateStatus(status: ContactMessageStatus): void {
    const message = this.selectedState();
    const etag = this.selectedEtagState();

    if (!message || !etag || this.updatingState()) {
      if (message && !etag)
        this.errorState.set($localize`:@@admin.contacts.etagMissing:Reabra a mensagem antes de alterar o status.`);
      return;
    }

    this.updatingState.set(true);
    this.errorState.set(null);
    const headers = new HttpHeaders({ 'If-Match': etag, 'X-Admin-CSRF': '1' });
    const body: ContactMessageStatusUpdate = { status };

    this.httpClient.patch<ContactMessageDetail>(`${this.detailEndpoint(message.id)}/status`, body, {
      headers,
      observe: 'response',
    })
      .pipe(take(1), finalize(() => this.updatingState.set(false)))
      .subscribe({
        next: (response) => {
          this.receiveDetail(response);
          const updated = response.body ?? { ...message, status };
          this.messagesState.update((messages) => messages.map((current) =>
            current.id === updated.id ? { ...current, status: updated.status } : current));
        },
        error: (error: HttpErrorResponse) => this.errorState.set(error.status === 412
          ? $localize`:@@admin.contacts.conflict:Esta mensagem foi alterada em outra sessão. Reabra para continuar.`
          : $localize`:@@admin.contacts.updateError:Não foi possível atualizar o status da mensagem.`),
      });
  }

  public clearSelection(): void {
    this.selectedState.set(null);
    this.selectedEtagState.set(null);
  }

  private receiveDetail(response: HttpResponse<ContactMessageDetail>): void {
    if (!response.body) {
      this.errorState.set($localize`:@@admin.contacts.emptyDetail:A API não retornou os dados da mensagem.`);
      return;
    }

    this.selectedState.set(response.body);
    this.selectedEtagState.set(response.headers.get('ETag'));
  }

  private detailEndpoint(messageId: string): string {
    return `${CONTACT_MESSAGES_ENDPOINT}/${encodeURIComponent(messageId)}`;
  }

  private mergeMessages(
    current: readonly ContactMessageSummary[],
    page: readonly ContactMessageSummary[],
  ): ContactMessageSummary[] {
    const byId = new Map(current.map((message) => [message.id, message]));

    page.forEach((message) => byId.set(message.id, message));

    return [...byId.values()]
      .sort((first, second) => second.receivedAt.localeCompare(first.receivedAt));
  }
}
