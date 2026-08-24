import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import { ContactMessageFilter } from './models/contact-message-filter.type';
import { ContactMessageStatus } from './models/contact-message-status.type';
import { ContactMessageSummary } from './models/contact-message-summary.model';
import { ContactInboxService } from './services/contact-inbox.service';

@Component({
  selector: 'app-contact-inbox',
  templateUrl: './contact-inbox.component.html',
  styleUrl: './contact-inbox.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ContactInboxComponent implements OnInit {
  protected readonly inbox = inject(ContactInboxService);
  protected readonly filter = signal<ContactMessageFilter>('all');
  protected readonly filterOptions: { readonly label: string; readonly value: ContactMessageFilter }[] = [
    { label: $localize`:@@admin.contacts.filterAll:Todas`, value: 'all' },
    { label: $localize`:@@admin.contacts.filterNew:Novas`, value: 'new' },
    { label: $localize`:@@admin.contacts.filterRead:Lidas`, value: 'read' },
    { label: $localize`:@@admin.contacts.filterResolved:Resolvidas`, value: 'resolved' },
  ];
  protected readonly filteredMessages = computed(() => {
    const filter = this.filter();

    return filter === 'all'
      ? this.inbox.messages()
      : this.inbox.messages().filter((message) => message.status === filter);
  });

  public ngOnInit(): void {
    this.inbox.load();
  }

  protected open(message: ContactMessageSummary): void {
    this.inbox.select(message.id);
  }

  protected refresh(): void {
    const filter = this.filter();

    this.inbox.load(filter === 'all' ? undefined : filter);
  }

  protected changeFilter(filter: ContactMessageFilter): void {
    this.filter.set(filter);
    this.inbox.clearSelection();
    this.inbox.load(filter === 'all' ? undefined : filter);
  }

  protected setStatus(status: ContactMessageStatus): void {
    this.inbox.updateStatus(status);
  }

  protected statusLabel(status: ContactMessageStatus): string {
    const labels: Record<ContactMessageStatus, string> = {
      new: $localize`:@@admin.contacts.statusNew:Nova`,
      read: $localize`:@@admin.contacts.statusRead:Lida`,
      resolved: $localize`:@@admin.contacts.statusResolved:Resolvida`,
    };

    return labels[status];
  }

  protected statusSeverity(status: ContactMessageStatus): 'info' | 'secondary' | 'success' {
    return status === 'new' ? 'info' : status === 'resolved' ? 'success' : 'secondary';
  }
}
