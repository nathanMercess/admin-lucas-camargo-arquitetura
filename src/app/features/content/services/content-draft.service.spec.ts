import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DEFAULT_SITE_CONFIG } from '@shared/config/default-site-config';
import { SiteConfigV1 } from '@shared/models/site-config-v1.model';

import {
  CONTENT_DRAFT_DEVELOPMENT_FALLBACK,
  ContentDraftService,
} from './content-draft.service';

describe('ContentDraftService', () => {
  let httpTestingController: HttpTestingController;
  let service: ContentDraftService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: CONTENT_DRAFT_DEVELOPMENT_FALLBACK,
          useValue: true,
        },
      ],
    });

    httpTestingController = TestBed.inject(HttpTestingController);
    service = TestBed.inject(ContentDraftService);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('loads the draft and preserves its ETag', () => {
    service.load();

    expect(service.loading()).toBe(true);

    const request = httpTestingController.expectOne('/api/v1/content/draft');
    request.flush(DEFAULT_SITE_CONFIG, {
      headers: { ETag: '"draft-v1"' },
    });

    expect(request.request.method).toBe('GET');
    expect(service.draft()).toEqual(DEFAULT_SITE_CONFIG);
    expect(service.etag()).toBe('"draft-v1"');
    expect(service.loading()).toBe(false);
    expect(service.dirty()).toBe(false);
    expect(service.developmentFallback()).toBe(false);
  });

  it('saves with If-Match and stores the next ETag', () => {
    service.load();

    const loadRequest = httpTestingController.expectOne('/api/v1/content/draft');
    loadRequest.flush(DEFAULT_SITE_CONFIG, {
      headers: { ETag: '"draft-v1"' },
    });

    const updatedDraft: SiteConfigV1 = {
      ...DEFAULT_SITE_CONFIG,
      identity: {
        ...DEFAULT_SITE_CONFIG.identity,
        descriptor: 'Arquitetura autoral',
      },
    };

    service.updateDraft(updatedDraft);
    service.save();

    expect(service.dirty()).toBe(true);
    expect(service.saving()).toBe(true);

    const saveRequest = httpTestingController.expectOne('/api/v1/content/draft');

    expect(saveRequest.request.method).toBe('PUT');
    expect(saveRequest.request.headers.get('If-Match')).toBe('"draft-v1"');
    expect(saveRequest.request.headers.get('X-Admin-CSRF')).toBe('1');
    expect(saveRequest.request.body).toEqual(updatedDraft);

    saveRequest.flush(updatedDraft, {
      headers: { ETag: '"draft-v2"' },
    });

    expect(service.etag()).toBe('"draft-v2"');
    expect(service.saving()).toBe(false);
    expect(service.dirty()).toBe(false);
  });

  it('bootstraps a missing draft with If-None-Match', () => {
    service.load();

    const loadRequest = httpTestingController.expectOne('/api/v1/content/draft');
    loadRequest.flush('Not Found', { status: 404, statusText: 'Not Found' });

    expect(service.draft()).toEqual(DEFAULT_SITE_CONFIG);
    expect(service.dirty()).toBe(true);
    expect(service.developmentFallback()).toBe(false);

    service.save();

    const saveRequest = httpTestingController.expectOne('/api/v1/content/draft');
    expect(saveRequest.request.headers.get('If-None-Match')).toBe('*');
    expect(saveRequest.request.headers.get('X-Admin-CSRF')).toBe('1');
    saveRequest.flush(DEFAULT_SITE_CONFIG, { headers: { ETag: '"draft-v1"' } });
  });

  it('uses an explicit local fallback when the API is unavailable in development', () => {
    service.load();

    const request = httpTestingController.expectOne('/api/v1/content/draft');
    request.flush('Unavailable', { status: 503, statusText: 'Service Unavailable' });

    expect(service.draft()).toEqual(DEFAULT_SITE_CONFIG);
    expect(service.developmentFallback()).toBe(true);
    expect(service.error()).toContain('modo local de desenvolvimento');

    service.updateDraft(structuredClone(DEFAULT_SITE_CONFIG));
    service.save();

    expect(service.dirty()).toBe(false);
    expect(service.error()).toContain('aplicadas apenas nesta sessão');
  });

  it('keeps changes pending when the ETag is stale', () => {
    service.load();

    const loadRequest = httpTestingController.expectOne('/api/v1/content/draft');
    loadRequest.flush(DEFAULT_SITE_CONFIG, {
      headers: { ETag: '"draft-v1"' },
    });

    service.updateDraft(structuredClone(DEFAULT_SITE_CONFIG));
    service.save();

    const saveRequest = httpTestingController.expectOne('/api/v1/content/draft');
    saveRequest.flush('Precondition Failed', {
      status: 412,
      statusText: 'Precondition Failed',
    });

    expect(service.dirty()).toBe(true);
    expect(service.saving()).toBe(false);
    expect(service.error()).toContain('alterado em outra sessão');
  });

  it('serializes a newer save behind the request already in flight', () => {
    service.load();

    const loadRequest = httpTestingController.expectOne('/api/v1/content/draft');
    loadRequest.flush(DEFAULT_SITE_CONFIG, {
      headers: { ETag: '"draft-v1"' },
    });

    const firstDraft: SiteConfigV1 = {
      ...DEFAULT_SITE_CONFIG,
      identity: {
        ...DEFAULT_SITE_CONFIG.identity,
        descriptor: 'Primeira alteração',
      },
    };
    const secondDraft: SiteConfigV1 = {
      ...firstDraft,
      identity: {
        ...firstDraft.identity,
        descriptor: 'Segunda alteração',
      },
    };

    service.updateDraft(firstDraft);
    service.save();

    const firstSaveRequest = httpTestingController.expectOne('/api/v1/content/draft');

    service.updateDraft(secondDraft);
    service.save();

    expect(httpTestingController.match('/api/v1/content/draft')).toHaveLength(0);

    firstSaveRequest.flush(firstDraft, {
      headers: { ETag: '"draft-v2"' },
    });

    const secondSaveRequest = httpTestingController.expectOne('/api/v1/content/draft');

    expect(secondSaveRequest.request.headers.get('If-Match')).toBe('"draft-v2"');
    expect(secondSaveRequest.request.body).toEqual(secondDraft);
    expect(service.dirty()).toBe(true);

    secondSaveRequest.flush(secondDraft, {
      headers: { ETag: '"draft-v3"' },
    });

    expect(service.draft()).toEqual(secondDraft);
    expect(service.etag()).toBe('"draft-v3"');
    expect(service.dirty()).toBe(false);
  });
});
