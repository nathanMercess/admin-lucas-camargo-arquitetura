import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DEFAULT_SITE_CONFIG } from '@shared/config/default-site-config';
import { isSiteConfigV2 } from '@shared/guards/site-document.guard';
import { SiteConfigV1 } from '@shared/models/site-config-v1.model';
import { SiteConfigV2 } from '@shared/models/site-config-v2.model';

import {
  CONTENT_DRAFT_DEVELOPMENT_FALLBACK,
  ContentDraftService,
} from './content-draft.service';

const SITE_CONFIG_V2: SiteConfigV2 = {
  schemaVersion: 2,
  releaseId: 'draft-v2',
  publishedAt: '2026-08-24T12:00:00.000Z',
  locale: DEFAULT_SITE_CONFIG.locale,
  identity: DEFAULT_SITE_CONFIG.identity,
  seo: DEFAULT_SITE_CONFIG.seo,
  theme: DEFAULT_SITE_CONFIG.theme,
  uiLabels: DEFAULT_SITE_CONFIG.uiLabels,
  media: DEFAULT_SITE_CONFIG.media,
  header: DEFAULT_SITE_CONFIG.header,
  navigationItems: DEFAULT_SITE_CONFIG.navigationItems,
  portfolioCategories: DEFAULT_SITE_CONFIG.portfolioCategories,
  projects: DEFAULT_SITE_CONFIG.projects,
  footer: DEFAULT_SITE_CONFIG.footer,
  contact: {
    email: 'arquiteto@lucascamargo.com',
    phoneLabel: '11 98668-1572',
    phoneE164: '+5511986681572',
    instagramUrl: 'https://www.instagram.com/lucascamargo.arquiteto/',
    whatsappNumber: '5511986681572',
    whatsappDefaultMessage: 'Olá, gostaria de conversar sobre um projeto.',
  },
  pages: [
    {
      id: 'home',
      slug: 'home',
      path: '/',
      order: 10,
      visible: true,
      seo: {
        title: 'Lucas Camargo Arquitetura',
        description: 'Arquitetura autoral do primeiro traço à construção.',
        canonicalPath: '/',
        imageMediaId: 'open-graph',
        noIndex: false,
      },
      sections: [
        DEFAULT_SITE_CONFIG.sections[0],
        {
          id: 'project-grid',
          type: 'project-grid',
          order: 20,
          visible: true,
          anchor: 'projetos',
          variant: 'grid-v1',
          overline: DEFAULT_SITE_CONFIG.sections[3].overline,
          title: DEFAULT_SITE_CONFIG.sections[3].title,
          description: DEFAULT_SITE_CONFIG.sections[3].description,
          projectIds: [],
          maxColumns: 3,
        },
        {
          id: 'whatsapp-cta',
          type: 'whatsapp-cta',
          order: 30,
          visible: true,
          anchor: 'contato',
          variant: 'editorial-v1',
          overline: DEFAULT_SITE_CONFIG.sections[7].overline,
          title: DEFAULT_SITE_CONFIG.sections[7].title,
          body: ['Conte brevemente o que você imagina para o seu projeto.'],
          label: 'Conversar pelo WhatsApp',
          message: 'Olá, gostaria de conversar sobre um projeto.',
        },
        {
          id: 'contact-form',
          type: 'contact-form',
          order: 40,
          visible: true,
          anchor: 'mensagem',
          variant: 'default-v1',
          overline: 'MENSAGEM',
          title: {
            lines: [{ segments: [{ text: 'Conte um pouco sobre o seu projeto.', emphasis: false }] }],
          },
          description: ['Preencha os campos abaixo para iniciar uma conversa.'],
          nameLabel: 'Nome',
          emailLabel: 'E-mail',
          phoneLabel: 'Telefone',
          subjectLabel: 'Assunto',
          messageLabel: 'Mensagem',
          submitLabel: 'Enviar mensagem',
          successMessage: 'Mensagem enviada. Em breve entraremos em contato.',
          errorMessage: 'Não foi possível enviar agora. Tente novamente.',
          privacyNotice: 'Seus dados serão usados apenas para responder ao seu contato.',
        },
      ],
    },
  ],
};

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

  it('loads and saves a version-two document without converting its schema', () => {
    service.load();

    const loadRequest = httpTestingController.expectOne('/api/v1/content/draft');
    loadRequest.flush(SITE_CONFIG_V2, {
      headers: { ETag: '"draft-v2"' },
    });
    const loadedDraft = service.draft();

    expect(isSiteConfigV2(loadedDraft)).toBe(true);
    expect(loadedDraft).toEqual(SITE_CONFIG_V2);

    if (!isSiteConfigV2(loadedDraft))
      throw new Error('O rascunho V2 deveria ser preservado pelo transporte.');

    const updatedDraft: SiteConfigV2 = {
      ...loadedDraft,
      contact: {
        ...loadedDraft.contact,
        whatsappDefaultMessage: 'Quero iniciar um novo projeto.',
      },
    };

    service.updateDraft(updatedDraft);
    service.save();

    const saveRequest = httpTestingController.expectOne('/api/v1/content/draft');

    expect(saveRequest.request.headers.get('If-Match')).toBe('"draft-v2"');
    expect(saveRequest.request.body).toEqual(updatedDraft);
    expect('sections' in saveRequest.request.body).toBe(false);
    expect('visualBuilder' in saveRequest.request.body).toBe(false);

    saveRequest.flush(updatedDraft, {
      headers: { ETag: '"draft-v2-next"' },
    });

    expect(service.draft()).toEqual(updatedDraft);
    expect(service.etag()).toBe('"draft-v2-next"');
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

  it('explains how to recover when saving outside the official admin address', () => {
    service.load();

    httpTestingController.expectOne('/api/v1/content/draft').flush(DEFAULT_SITE_CONFIG, {
      headers: { ETag: '"draft-v1"' },
    });

    service.updateDraft(structuredClone(DEFAULT_SITE_CONFIG));
    service.save();

    httpTestingController.expectOne('/api/v1/content/draft').flush('Forbidden', {
      status: 403,
      statusText: 'Forbidden',
    });

    expect(service.dirty()).toBe(true);
    expect(service.error()).toContain('admin.lucascamargo.com');
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

  it('registers an uploaded asset once in the current draft', () => {
    service.load();
    httpTestingController.expectOne('/api/v1/content/draft').flush(DEFAULT_SITE_CONFIG, {
      headers: { ETag: '"draft-v1"' },
    });
    const asset = {
      id: 'new-project-image',
      path: '/content/releases/new-project-image.webp',
      mimeType: 'image/webp',
      width: 1600,
      height: 1000,
      sha256: 'a'.repeat(64),
      provenance: 'project' as const,
    };

    expect(service.registerMediaAsset(asset)).toBe(true);
    expect(service.registerMediaAsset(asset)).toBe(false);
    expect(service.draft()?.media.filter((current) => current.id === asset.id)).toEqual([asset]);
    expect(service.dirty()).toBe(true);
  });
});
