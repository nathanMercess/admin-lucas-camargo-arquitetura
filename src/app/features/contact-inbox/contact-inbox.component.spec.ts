import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContactMessageDetail } from './models/contact-message-detail.model';
import { ContactInboxComponent } from './contact-inbox.component';
import { ContactInboxModule } from './contact-inbox.module';
import { ContactInboxService } from './services/contact-inbox.service';

const MESSAGE: ContactMessageDetail = {
  schemaVersion: 1,
  id: 'msg-1',
  receivedAt: '2026-08-24T12:00:00.000Z',
  status: 'new',
  name: 'Cliente Real',
  email: 'cliente@example.com',
  phone: '+5511999999999',
  subject: 'Projeto residencial',
  message: 'Gostaria de conversar sobre um projeto.',
  source: 'website',
  requestId: 'request-1',
  turnstileHostname: 'lucascamargo.com',
};

class ContactInboxServiceStub {
  public readonly messages = signal([MESSAGE, { ...MESSAGE, id: 'msg-2', status: 'resolved' as const }]);
  public readonly selected = signal<ContactMessageDetail | null>(null);
  public readonly selectedEtag = signal<string | null>(null);
  public readonly nextCursor = signal<string | null>(null);
  public readonly loading = signal(false);
  public readonly detailLoading = signal(false);
  public readonly updating = signal(false);
  public readonly error = signal<string | null>(null);
  public readonly load = vi.fn();
  public readonly loadMore = vi.fn();
  public readonly select = vi.fn();
  public readonly updateStatus = vi.fn();
  public readonly clearSelection = vi.fn();
}

describe('ContactInboxComponent', () => {
  let fixture: ComponentFixture<ContactInboxComponent>;
  let service: ContactInboxServiceStub;

  beforeEach(async () => {
    service = new ContactInboxServiceStub();
    await TestBed.configureTestingModule({
      imports: [ContactInboxModule],
    })
      .overrideProvider(ContactInboxService, { useValue: service })
      .compileComponents();
    fixture = TestBed.createComponent(ContactInboxComponent);
    fixture.detectChanges();
  });

  it('loads the inbox and filters new, read and resolved messages locally', () => {
    const access = fixture.componentInstance as unknown as {
      filter: { set(value: 'new' | 'resolved'): void };
      filteredMessages(): readonly ContactMessageDetail[];
    };

    expect(service.load).toHaveBeenCalledOnce();
    access.filter.set('resolved');
    expect(access.filteredMessages().map((message) => message.id)).toEqual(['msg-2']);
    access.filter.set('new');
    expect(access.filteredMessages().map((message) => message.id)).toEqual(['msg-1']);
  });

  it('opens a message and delegates status changes to the versioned service', () => {
    const access = fixture.componentInstance as unknown as {
      open(message: ContactMessageDetail): void;
      setStatus(status: 'resolved'): void;
    };

    access.open(MESSAGE);
    access.setStatus('resolved');

    expect(service.select).toHaveBeenCalledWith('msg-1');
    expect(service.updateStatus).toHaveBeenCalledWith('resolved');
  });
});
