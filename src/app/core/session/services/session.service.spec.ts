import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { SESSION_DEVELOPMENT_FALLBACK, SessionService } from './session.service';

describe('SessionService', () => {
  let service: SessionService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SESSION_DEVELOPMENT_FALLBACK, useValue: false },
      ],
    });

    service = TestBed.inject(SessionService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('loads the authenticated identity from the same-origin API', () => {
    service.load();

    expect(service.loading()).toBe(true);
    expect(service.error()).toBeNull();

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
    expect(service.ready()).toBe(true);
    expect(service.developmentFallback()).toBe(false);
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

  it('exposes a recoverable error when the session API is unavailable in production', () => {
    service.load();

    const request = httpTestingController.expectOne('/api/v1/session');
    request.flush('Unavailable', { status: 503, statusText: 'Service Unavailable' });

    expect(service.loading()).toBe(false);
    expect(service.session()).toBeNull();
    expect(service.developmentFallback()).toBe(false);
    expect(service.error()).toContain('Tente novamente');
    expect(service.ready()).toBe(true);
  });

  it('authenticates and resolves the new cookie-backed session', () => {
    service.login('nathanMercess', 'valid-password');

    const loginRequest = httpTestingController.expectOne('/api/v1/auth/login');

    expect(loginRequest.request.method).toBe('POST');
    expect(loginRequest.request.body).toEqual({
      username: 'nathanMercess',
      password: 'valid-password',
    });
    expect(loginRequest.request.headers.get('X-Admin-CSRF')).toBe('1');
    loginRequest.flush(null, { status: 204, statusText: 'No Content' });

    const sessionRequest = httpTestingController.expectOne('/api/v1/session');
    sessionRequest.flush({
      subject: 'credentials:owner',
      email: 'nathan66merces@gmail.com',
      role: 'owner',
      permissions: ['session:read'],
      publishedContentBaseUrl: '/content',
    });

    expect(service.authenticating()).toBe(false);
    expect(service.session()?.subject).toBe('credentials:owner');
    expect(service.error()).toBeNull();
  });

  it('keeps invalid credentials outside the admin', () => {
    service.login('nathanMercess', 'invalid-password');

    const request = httpTestingController.expectOne('/api/v1/auth/login');
    request.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(service.authenticating()).toBe(false);
    expect(service.session()).toBeNull();
    expect(service.error()).toContain('inválidos');
  });

  it('clears the local session after the API confirms logout', () => {
    service.load();
    httpTestingController.expectOne('/api/v1/session').flush({
      subject: 'credentials:owner',
      email: 'nathan66merces@gmail.com',
      role: 'owner',
      permissions: ['session:read'],
      publishedContentBaseUrl: '/content',
    });

    service.logout();
    const request = httpTestingController.expectOne('/api/v1/auth/logout');

    expect(request.request.headers.get('X-Admin-CSRF')).toBe('1');
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(service.session()).toBeNull();
    expect(service.authenticating()).toBe(false);
  });
});

describe('SessionService local development fallback', () => {
  let service: SessionService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SESSION_DEVELOPMENT_FALLBACK, useValue: true },
      ],
    });

    service = TestBed.inject(SessionService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('uses a neutral local state when the API is unavailable', () => {
    service.load();

    const request = httpTestingController.expectOne('/api/v1/session');
    request.error(new ProgressEvent('network-error'));

    expect(service.loading()).toBe(false);
    expect(service.session()).toBeNull();
    expect(service.error()).toBeNull();
    expect(service.developmentFallback()).toBe(true);
  });

  it('does not bypass the login when the API returns unauthorized', () => {
    service.load();

    const request = httpTestingController.expectOne('/api/v1/session');
    request.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(service.ready()).toBe(true);
    expect(service.session()).toBeNull();
    expect(service.developmentFallback()).toBe(false);
  });
});
