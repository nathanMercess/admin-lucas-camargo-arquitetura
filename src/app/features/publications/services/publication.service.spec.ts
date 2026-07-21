import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PublishedManifestV1 } from '@shared/models/published-manifest-v1.model';

import { PublicationService } from './publication.service';

describe('PublicationService', () => {
  let service: PublicationService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), PublicationService],
    });
    service = TestBed.inject(PublicationService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('publishes with the current strong ETag and CSRF header', () => {
    let completed = false;
    service.publish('"draft-v3"', () => completed = true);

    const publishRequest = httpTestingController.expectOne('/api/v1/releases');
    expect(publishRequest.request.method).toBe('POST');
    expect(publishRequest.request.headers.get('If-Match')).toBe('"draft-v3"');
    expect(publishRequest.request.headers.get('X-Admin-CSRF')).toBe('1');
    const manifest: PublishedManifestV1 = {
      schemaVersion: 1,
      releaseId: 'release-3',
      siteConfigKey: 'releases/release-3.json',
      sha256: 'abc123',
      publishedAt: '2026-07-21T02:00:00.000Z',
    };
    publishRequest.flush(manifest, { status: 201, statusText: 'Created' });

    const historyRequest = httpTestingController.expectOne('/api/v1/releases');
    expect(historyRequest.request.method).toBe('GET');
    historyRequest.flush([]);

    expect(completed).toBe(true);
    expect(service.lastManifest()).toEqual(manifest);
    expect(service.mutating()).toBe(false);
  });

  it('rolls back an encoded release id with optimistic concurrency', () => {
    service.rollback('release-2', '"draft-v4"', () => undefined);

    const rollbackRequest = httpTestingController.expectOne('/api/v1/releases/release-2/rollback');
    expect(rollbackRequest.request.headers.get('If-Match')).toBe('"draft-v4"');
    rollbackRequest.flush({
      schemaVersion: 1,
      releaseId: 'release-2',
      siteConfigKey: 'releases/release-2.json',
      sha256: 'def456',
      publishedAt: '2026-07-20T02:00:00.000Z',
    });
    httpTestingController.expectOne('/api/v1/releases').flush([]);

    expect(service.error()).toBeNull();
  });
});
