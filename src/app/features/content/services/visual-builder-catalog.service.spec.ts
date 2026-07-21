import { TestBed } from '@angular/core/testing';
import { DEFAULT_SITE_CONFIG } from '@shared/config/default-site-config';

import { VisualBuilderCatalogService } from './visual-builder-catalog.service';

describe('VisualBuilderCatalogService', () => {
  let service: VisualBuilderCatalogService;

  beforeEach(() => {
    service = TestBed.inject(VisualBuilderCatalogService);
  });

  it('offers a broad, searchable set of brand-safe blocks', () => {
    const categories = new Set(service.blocks.map((block) => block.category.label));

    expect(service.blocks.length).toBeGreaterThanOrEqual(16);
    expect(categories).toEqual(new Set([
      'Estrutura da página',
      'Cabeçalho e navegação',
      'Apresentação',
      'Projetos e portfólio',
      'Serviços',
      'Sobre o escritório',
      'Credibilidade',
      'Contato e conversão',
      'Formulários',
      'Galerias e mídia',
      'Rodapé',
    ]));
    expect(service.blocks.every((block) => !block.content.includes('<script'))).toBe(true);
  });

  it('keeps presentation metadata complete and technical ids out of labels', () => {
    const kinds = new Set(service.blocks.map((block) => block.kind));

    expect(kinds).toEqual(new Set(['basic', 'layout', 'section', 'global']));
    expect(service.blocks.every((block) => block.icon.startsWith('pi-'))).toBe(true);
    expect(service.blocks.every((block) => block.configurableFields.length > 0)).toBe(true);
    expect(service.blocks.every((block) => block.label !== block.id)).toBe(true);
    expect(service.blocks.some((block) => block.id === 'architecture-hero-banner')).toBe(true);
    expect(service.blocks.some((block) => block.id === 'project-gallery-grid')).toBe(true);
    expect(service.blocks.some((block) => block.id === 'contact-cta-section')).toBe(true);
  });

  it('exposes only implemented component variations', () => {
    const columns = service.blocks.find((block) => block.id === 'text-media-layout');
    const header = service.blocks.find((block) => block.id === 'transparent-header');

    expect(columns?.variations.map((variation) => variation.label)).toEqual([
      'Mídia à direita',
      'Mídia à esquerda',
    ]);
    expect(columns?.variations[1].content).toContain('Selecione uma imagem do projeto');
    expect(header?.variations.map((variation) => variation.label)).toEqual([
      'Transparente',
      'Fundo claro',
    ]);
  });

  it('builds page templates from the real site configuration', () => {
    const templates = service.getTemplates(DEFAULT_SITE_CONFIG, []);
    const homeTemplate = templates.find((template) => template.id === 'studio-home');

    expect(templates).toHaveLength(4);
    expect(homeTemplate?.content).toContain(DEFAULT_SITE_CONFIG.identity.brandName);
    expect(homeTemplate?.content).toContain(DEFAULT_SITE_CONFIG.footer.statement);
    expect(homeTemplate?.content).toContain('lc-architectural-hero');
    expect(homeTemplate?.content).toContain('architecture-reference.jpg');
    expect(homeTemplate?.content).toContain('logo-light.png');
    expect(homeTemplate?.styles).toContain('min-height:100svh');
    expect(homeTemplate?.styles).toContain('[data-hide-mobile="true"]');
  });
});
