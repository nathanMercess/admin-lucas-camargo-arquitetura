import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DEFAULT_SITE_CONFIG } from '@shared/config/default-site-config';
import { ThemeConfig } from '@shared/models/theme-config.model';

import { ContentEditorComponent } from './content-editor.component';
import { ContentModule } from './content.module';
import {
  CONTENT_DRAFT_DEVELOPMENT_FALLBACK,
  ContentDraftService,
} from './services/content-draft.service';

class ResizeObserverMock {
  public constructor(callback: ResizeObserverCallback) {
    void callback;
  }

  public disconnect(): void {
    return;
  }

  public observe(target: Element): void {
    void target;
  }

  public unobserve(target: Element): void {
    void target;
  }
}

describe('ContentEditorComponent', () => {
  let draftService: ContentDraftService;
  let fixture: ComponentFixture<ContentEditorComponent>;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;

    await TestBed.configureTestingModule({
      imports: [ContentModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: CONTENT_DRAFT_DEVELOPMENT_FALLBACK,
          useValue: true,
        },
      ],
    }).compileComponents();

    draftService = TestBed.inject(ContentDraftService);
    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ContentEditorComponent);
    fixture.detectChanges();

    const request = httpTestingController.expectOne('/api/v1/content/draft');
    request.flush(structuredClone(DEFAULT_SITE_CONFIG), {
      headers: { ETag: '"draft-v1"' },
    });

    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('updates identity and saves the draft with the loaded version', async () => {
    const rootElement = fixture.nativeElement as HTMLElement;
    const input = rootElement.querySelector<HTMLInputElement>('#identity-brand-name');

    expect(input).not.toBeNull();

    input!.value = 'Lucas Camargo Studio';
    input!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(draftService.draft()?.identity.brandName).toBe('Lucas Camargo Studio');
    expect(draftService.dirty()).toBe(true);

    const form = rootElement.querySelector<HTMLFormElement>('form');
    form!.dispatchEvent(new Event('submit'));

    const request = httpTestingController.expectOne('/api/v1/content/draft');

    expect(request.request.method).toBe('PUT');
    expect(request.request.headers.get('If-Match')).toBe('"draft-v1"');
    expect(request.request.body.identity.brandName).toBe('Lucas Camargo Studio');
    expect(request.request.body.theme.colors.border).toBe('rgb(51 51 50 / 20%)');

    request.flush(request.request.body, {
      headers: { ETag: '"draft-v2"' },
    });

    await fixture.whenStable();

    expect(draftService.dirty()).toBe(false);
    expect(draftService.etag()).toBe('"draft-v2"');
  });

  it('changes section visibility without mutating the remaining content', () => {
    const rootElement = fixture.nativeElement as HTMLElement;
    const toggle = rootElement.querySelector<HTMLInputElement>('#section-visible-hero');

    expect(toggle).not.toBeNull();

    toggle!.click();
    fixture.detectChanges();

    const heroSection = draftService.draft()?.sections.find((section) => section.id === 'hero');

    expect(heroSection?.visible).toBe(false);
    expect(draftService.draft()?.sections).toHaveLength(DEFAULT_SITE_CONFIG.sections.length);
    expect(draftService.dirty()).toBe(true);
  });

  it('applies a template theme while preserving content, projects and media', () => {
    const originalDraft = structuredClone(draftService.draft()!);
    const galleryTheme: ThemeConfig = {
      ...originalDraft.theme,
      presetId: 'gallery-v1',
      layout: {
        ...originalDraft.theme.layout,
        contentMaxWidthPx: 1760,
      },
    };
    const component = fixture.componentInstance as unknown as {
      handleTemplateChange(theme: ThemeConfig): void;
    };

    component.handleTemplateChange(galleryTheme);
    fixture.detectChanges();

    const updatedDraft = draftService.draft()!;

    expect(updatedDraft.theme.presetId).toBe('gallery-v1');
    expect(updatedDraft.theme.layout.contentMaxWidthPx).toBe(1760);
    expect(updatedDraft.identity).toEqual(originalDraft.identity);
    expect(updatedDraft.sections).toEqual(originalDraft.sections);
    expect(updatedDraft.projects).toEqual(originalDraft.projects);
    expect(updatedDraft.media).toEqual(originalDraft.media);
    expect(draftService.dirty()).toBe(true);
  });
});
