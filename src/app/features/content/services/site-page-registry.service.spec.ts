import { TestBed } from '@angular/core/testing';
import { DEFAULT_SITE_CONFIG } from '@shared/config/default-site-config';
import { PortfolioProject } from '@shared/models/portfolio-project.model';
import { SiteConfigV1 } from '@shared/models/site-config-v1.model';

import { SitePageRegistryService } from './site-page-registry.service';

const PROJECT: PortfolioProject = {
  id: 'casa-serena',
  slug: 'casa-serena',
  title: 'Casa Serena',
  summary: 'Residência integrada à paisagem.',
  description: ['Uma arquitetura desenhada para permanecer.'],
  categoryIds: ['projects'],
  cover: {
    assetId: 'architecture-reference',
    alt: 'Fachada da Casa Serena',
    decorative: false,
    focalPointX: 50,
    focalPointY: 50,
  },
  gallery: [],
  location: 'São Paulo',
  year: '2026',
  services: ['Arquitetura'],
  order: 10,
  visible: true,
  seo: {
    title: 'Casa Serena',
    description: 'Residência integrada à paisagem.',
    canonicalPath: '/portfolio/projeto/casa-serena',
    imageMediaId: 'architecture-reference',
    noIndex: false,
  },
};

describe('SitePageRegistryService', () => {
  let service: SitePageRegistryService;

  beforeEach(() => {
    service = TestBed.inject(SitePageRegistryService);
  });

  it('separates concrete pages, shared templates, dynamic data and the 404 fallback', () => {
    const pages = service.getPages(withProjects([PROJECT]));

    expect(pages.map((page) => [page.technicalId, page.kind])).toEqual([
      ['site-home-page', 'concrete-page'],
      ['portfolio-index-page', 'concrete-page'],
      ['portfolio-category-template', 'shared-template'],
      ['portfolio-project-template', 'shared-template'],
      ['portfolio-category-data:projects', 'dynamic-data'],
      ['portfolio-category-data:construction-work', 'dynamic-data'],
      ['portfolio-project-data:casa-serena', 'dynamic-data'],
      ['not-found-page', 'system-page'],
    ]);
  });

  it('represents category and project layouts once instead of duplicating a page per record', () => {
    const pages = service.getPages(withProjects([
      PROJECT,
      { ...PROJECT, id: 'casa-vale', slug: 'casa-vale', title: 'Casa Vale' },
    ]));
    const categoryTemplate = pages.find((page) => page.technicalId === 'portfolio-category-template');
    const projectTemplate = pages.find((page) => page.technicalId === 'portfolio-project-template');

    expect(categoryTemplate).toMatchObject({
      route: '/portfolio/categoria/:categoryId',
      routeKind: 'parameterized',
      dataSource: 'portfolio-categories',
    });
    expect(projectTemplate).toMatchObject({
      route: '/portfolio/projeto/:slug',
      routeKind: 'parameterized',
      dataSource: 'portfolio-projects',
    });
    expect(pages.filter((page) => page.technicalId === 'portfolio-project-template')).toHaveLength(1);
    expect(pages.filter((page) => page.templateId === 'portfolio-project-template'
      && page.kind === 'dynamic-data')).toHaveLength(2);
  });

  it('validates the concrete /portfolio/categoria/projects route and template fallback', () => {
    const config = withProjects([PROJECT]);

    expect(service.findByRoute(config, '/portfolio/categoria/projects')).toMatchObject({
      technicalId: 'portfolio-category-data:projects',
      sourceId: 'projects',
      templateId: 'portfolio-category-template',
    });
    expect(service.findByRoute(config, '/portfolio/categoria/categoria-ainda-nao-cadastrada'))
      .toMatchObject({ technicalId: 'portfolio-category-template' });
  });

  it('resolves unknown addresses to the registered 404 page', () => {
    const config = withProjects([PROJECT]);

    expect(service.findByRoute(config, '/rota-inexistente')).toMatchObject({
      technicalId: 'not-found-page',
      route: '/**',
      routeKind: 'fallback',
      configurable: false,
    });
    expect(service.findByTechnicalId(config, 'missing-page')).toBeUndefined();
  });

  it('keeps identifiers and concrete dynamic routes unique when content conflicts', () => {
    const pages = service.getPages(withProjects([
      PROJECT,
      { ...PROJECT, id: 'casa-serena-copy', title: 'Casa Serena 2' },
      { ...PROJECT, slug: 'outra-rota', title: 'Casa Serena duplicada' },
    ]));
    const technicalIds = pages.map((page) => page.technicalId);
    const dynamicRoutes = pages
      .filter((page) => page.kind === 'dynamic-data')
      .map((page) => page.route);

    expect(new Set(technicalIds).size).toBe(technicalIds.length);
    expect(new Set(dynamicRoutes).size).toBe(dynamicRoutes.length);
    expect(pages.filter((page) => page.dataSource === 'portfolio-projects'
      && page.kind === 'dynamic-data')).toHaveLength(1);
  });

  it('registers absent institutional and legal families without exposing false routes', () => {
    const pages = service.getPages(withProjects([]));

    expect(service.absentRouteFamilies).toHaveLength(2);
    expect(service.absentRouteFamilies.join(' ')).toContain('institucionais');
    expect(service.absentRouteFamilies.join(' ')).toContain('legais');
    expect(pages.some((page) => page.route.includes('institucional'))).toBe(false);
    expect(pages.some((page) => page.route.includes('legal'))).toBe(false);
  });
});

function withProjects(projects: readonly PortfolioProject[]): SiteConfigV1 {
  return {
    ...DEFAULT_SITE_CONFIG,
    projects,
  };
}
