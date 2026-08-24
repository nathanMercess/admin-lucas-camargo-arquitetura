import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ContactMessageDetail } from '../models/contact-message-detail.model';
import { ContactInboxService } from './contact-inbox.service';

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

describe('ContactInboxService', () => {
  let http: HttpTestingController;
  let service: ContactInboxService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ContactInboxService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(ContactInboxService);
  });

  afterEach(() => http.verify());

  it('loads and orders the contact inbox by newest message first', () => {
    service.load();
    const request = http.expectOne('/api/v1/contact-messages?limit=25');
    request.flush({
      items: [
        MESSAGE,
        { ...MESSAGE, id: 'msg-2', receivedAt: '2026-08-24T13:00:00.000Z' },
      ],
      nextCursor: 'cursor-1',
    });

    expect(request.request.method).toBe('GET');
    expect(service.messages().map((message) => message.id)).toEqual(['msg-2', 'msg-1']);
    expect(service.nextCursor()).toBe('cursor-1');
    expect(service.loading()).toBe(false);
  });

  it('loads a detail and keeps its ETag for concurrency control', () => {
    service.select(MESSAGE.id);
    const request = http.expectOne('/api/v1/contact-messages/msg-1');
    request.flush(MESSAGE, { headers: { ETag: '"contact-1"' } });

    expect(request.request.method).toBe('GET');
    expect(service.selected()).toEqual(MESSAGE);
    expect(service.selectedEtag()).toBe('"contact-1"');
  });

  it('patches status with If-Match and replaces the ETag from the response', () => {
    service.select(MESSAGE.id);
    http.expectOne('/api/v1/contact-messages/msg-1')
      .flush(MESSAGE, { headers: { ETag: '"contact-1"' } });
    service.load();
    http.expectOne('/api/v1/contact-messages?limit=25').flush({ items: [MESSAGE] });

    service.updateStatus('resolved');
    const request = http.expectOne('/api/v1/contact-messages/msg-1/status');
    request.flush(
      { ...MESSAGE, status: 'resolved' },
      { headers: { ETag: '"contact-2"' } },
    );

    expect(request.request.method).toBe('PATCH');
    expect(request.request.headers.get('If-Match')).toBe('"contact-1"');
    expect(request.request.headers.get('X-Admin-CSRF')).toBe('1');
    expect(request.request.body).toEqual({ status: 'resolved' });
    expect(service.selected()?.status).toBe('resolved');
    expect(service.messages()[0].status).toBe('resolved');
    expect(service.selectedEtag()).toBe('"contact-2"');
  });

  it('reports an optimistic concurrency conflict without discarding the open message', () => {
    service.select(MESSAGE.id);
    http.expectOne('/api/v1/contact-messages/msg-1')
      .flush(MESSAGE, { headers: { ETag: '"contact-1"' } });

    service.updateStatus('read');
    http.expectOne('/api/v1/contact-messages/msg-1/status')
      .flush(null, { status: 412, statusText: 'Precondition Failed' });

    expect(service.error()).toContain('outra sessão');
    expect(service.selected()).toEqual(MESSAGE);
  });

  it('loads the next page with the opaque API cursor', () => {
    service.load('new');
    http.expectOne('/api/v1/contact-messages?limit=25&status=new')
      .flush({ items: [MESSAGE], nextCursor: 'opaque-cursor' });

    service.loadMore();
    const request = http.expectOne(
      '/api/v1/contact-messages?limit=25&status=new&cursor=opaque-cursor',
    );
    request.flush({
      items: [{ ...MESSAGE, id: 'msg-2', receivedAt: '2026-08-23T13:00:00.000Z' }],
    });

    expect(service.messages().map((message) => message.id)).toEqual(['msg-1', 'msg-2']);
    expect(service.nextCursor()).toBeNull();
  });
});
