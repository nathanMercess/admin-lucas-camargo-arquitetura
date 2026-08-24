import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { DEFAULT_SITE_CONFIG } from '@shared/config/default-site-config';
import { isSiteConfigV1, isSiteConfigV2 } from '@shared/guards/site-document.guard';
import { ThemeConfig } from '@shared/models/theme-config.model';
import { ConfirmationService } from 'primeng/api';

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
        provideRouter([]),
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

    const draft = draftService.draft();

    if (!isSiteConfigV1(draft))
      throw new Error('O teste exige um rascunho V1.');

    const heroSection = draft.sections.find((section) => section.id === 'hero');

    expect(heroSection?.visible).toBe(false);
    expect(draft.sections).toHaveLength(DEFAULT_SITE_CONFIG.sections.length);
    expect(draftService.dirty()).toBe(true);
  });

  it('applies a template theme while preserving content, projects and media', () => {
    const loadedDraft = draftService.draft();

    if (!isSiteConfigV1(loadedDraft))
      throw new Error('O teste exige um rascunho V1.');

    const originalDraft = structuredClone(loadedDraft);
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

    const updatedDraft = draftService.draft();

    if (!isSiteConfigV1(updatedDraft))
      throw new Error('A edição deveria preservar o schema V1.');

    expect(updatedDraft.theme.presetId).toBe('gallery-v1');
    expect(updatedDraft.theme.layout.contentMaxWidthPx).toBe(1760);
    expect(updatedDraft.identity).toEqual(originalDraft.identity);
    expect(updatedDraft.sections).toEqual(originalDraft.sections);
    expect(updatedDraft.projects).toEqual(originalDraft.projects);
    expect(updatedDraft.media).toEqual(originalDraft.media);
    expect(draftService.dirty()).toBe(true);
  });

  it('shows direct shortcuts for the two editable areas', () => {
    const rootElement = fixture.nativeElement as HTMLElement;
    const shortcuts = rootElement.querySelectorAll('.content-editor-workspace-actions article');

    expect(shortcuts).toHaveLength(2);
    expect(rootElement.textContent).toContain('Página inicial');
    expect(rootElement.textContent).toContain('Projetos e portfólio');
  });

  it('keeps the safe legacy editor without exposing the retired free-form visual flow', () => {
    const rootElement = fixture.nativeElement as HTMLElement;
    const tabs = [...rootElement.querySelectorAll<HTMLElement>('[role="tab"]')]
      .map((tab) => tab.textContent?.trim());

    expect(tabs).toEqual([
      'Textos e seções',
      'Marca e logos',
      'Menu e rodapé',
      'Estilos prontos',
      'Aparência avançada',
      'Google e compartilhamento',
    ]);
    expect(rootElement.querySelector('app-visual-page-builder')).toBeNull();
    expect(rootElement.textContent).toContain('Use apenas para uma correção urgente');
  });

  it('creates a new V2 bootstrap only after an explicit confirmation', () => {
    const confirmationService = TestBed.inject(ConfirmationService);
    const confirmSpy = vi.spyOn(confirmationService, 'confirm');
    const rootElement = fixture.nativeElement as HTMLElement;
    const createButton = [...rootElement.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Usar estrutura recomendada'));

    createButton?.click();

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(isSiteConfigV1(draftService.draft())).toBe(true);
    confirmSpy.mock.calls[0][0].accept?.();
    fixture.detectChanges();

    const document = draftService.draft();
    expect(isSiteConfigV2(document)).toBe(true);
    expect(isSiteConfigV2(document) ? document.pages[0].sections.map((section) => section.type) : [])
      .toEqual(['hero', 'project-grid', 'whatsapp-cta', 'contact-form']);
    expect(rootElement.querySelector('app-site-v2-builder')).not.toBeNull();
  });

  it('takes the portfolio shortcut to project administration', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const rootElement = fixture.nativeElement as HTMLElement;
    const projectsButton = [...rootElement.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Gerenciar projetos'));

    projectsButton?.click();

    expect(navigateSpy).toHaveBeenCalledWith(['/projects']);
  });
});
