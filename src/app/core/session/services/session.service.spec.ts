import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { SessionService } from './session.service';

describe('SessionService', () => {
  let service: SessionService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(SessionService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('loads the authenticated identity from the same-origin API', () => {
    service.load();

    const request = httpTestingController.expectOne('/api/v1/session');
    request.flush({
      subject: 'accounts.google.com:123',
      email: 'nathan66merces@gmail.com',
      role: 'owner',
      permissions: ['session:read'],
      publishedContentBaseUrl: 'https://content.example.com/content',
    });

    expect(request.request.method).toBe('GET');
    expect(service.session()?.email).toBe('nathan66merces@gmail.com');
    expect(service.resolvePublishedContentPath('/content/media/asset.webp')).toBe(
      'https://content.example.com/content/media/asset.webp',
    );
    expect(service.resolvePublishedContentPath('/brand/logo.svg')).toBe('/brand/logo.svg');
    expect(service.resolvePublishedContentPath('/content/media/../secret.webp')).toBe('');
    expect(service.resolvePublishedContentPath('/content/media//asset.webp')).toBe('');
    expect(service.loading()).toBe(false);
  });

  it('rejects an unsafe published content base returned by the API', () => {
    service.load();

    const request = httpTestingController.expectOne('/api/v1/session');
    request.flush({
      subject: 'accounts.google.com:123',
      email: 'nathan66merces@gmail.com',
      role: 'owner',
      permissions: ['session:read'],
      publishedContentBaseUrl: 'https://user:password@content.example.com/other',
    });

    expect(service.resolvePublishedContentPath('/content/media/asset.webp')).toBe('');
  });
});
