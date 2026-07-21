import { Injectable } from '@angular/core';
import { SiteConfigV1 } from '@shared/models/site-config-v1.model';

import { SitePageDefinition } from '../models/site-page-definition.model';

const CONCRETE_PAGES_GROUP = $localize`:@@admin.pages.groups.concrete:Páginas concretas`;
const SHARED_TEMPLATES_GROUP = $localize`:@@admin.pages.groups.templates:Templates compartilhados`;
const DYNAMIC_CONTENT_GROUP = $localize`:@@admin.pages.groups.dynamic:Dados dinâmicos`;
const SYSTEM_PAGES_GROUP = $localize`:@@admin.pages.groups.system:Páginas do sistema`;

@Injectable({ providedIn: 'root' })
export class SitePageRegistryService {
  public readonly absentRouteFamilies = [
    $localize`:@@admin.pages.absent.institutional:Não há páginas institucionais separadas: o conteúdo institucional está em seções da página inicial.`,
    $localize`:@@admin.pages.absent.legal:Não há páginas legais publicadas no roteamento atual.`,
  ] as const;

  public getPages(config: SiteConfigV1): readonly SitePageDefinition[] {
    const pages = [
      this.createHomePage(config),
      this.createPortfolioPage(config),
      this.createCategoryTemplate(config),
      this.createProjectTemplate(config),
      ...this.createCategoryData(config),
      ...this.createProjectData(config),
      this.createNotFoundPage(),
    ];

    return [...this.removeIdentifierConflicts(pages)].sort((first, second) =>
      this.comparePages(first, second));
  }

  public getGroupedPages(
    config: SiteConfigV1,
  ): ReadonlyMap<SitePageDefinition['group'], readonly SitePageDefinition[]> {
    const groups = new Map<SitePageDefinition['group'], readonly SitePageDefinition[]>();

    for (const page of this.getPages(config)) {
      const groupPages = groups.get(page.group) ?? [];
      groups.set(page.group, [...groupPages, page]);
    }

    return groups;
  }

  public findByTechnicalId(
    config: SiteConfigV1,
    technicalId: string,
  ): SitePageDefinition | undefined {
    const normalizedId = technicalId.trim();

    if (!normalizedId)
      return undefined;

    return this.getPages(config).find((page) => page.technicalId === normalizedId);
  }

  public findByRoute(config: SiteConfigV1, route: string): SitePageDefinition | undefined {
    const normalizedRoute = this.normalizeRoute(route);

    if (!normalizedRoute)
      return undefined;

    const concreteMatch = this.getPages(config).find((page) => page.route === normalizedRoute);

    if (concreteMatch)
      return concreteMatch;

    if (/^\/portfolio\/categoria\/[^/]+$/.test(normalizedRoute))
      return this.findByTechnicalId(config, 'portfolio-category-template');

    if (/^\/portfolio\/projeto\/[^/]+$/.test(normalizedRoute))
      return this.findByTechnicalId(config, 'portfolio-project-template');

    return this.findByTechnicalId(config, 'not-found-page');
  }

  private createHomePage(config: SiteConfigV1): SitePageDefinition {
    return {
      technicalId: 'site-home-page',
      name: $localize`:@@admin.pages.home.name:Página inicial`,
      description: $localize`:@@admin.pages.home.description:Página principal montada com as seções administráveis do site.`,
      route: '/',
      routePattern: '/',
      kind: 'concrete-page',
      routeKind: 'fixed',
      group: 'concrete-pages',
      groupLabel: CONCRETE_PAGES_GROUP,
      order: 10,
      status: config.sections.some((section) => section.visible) ? 'available' : 'empty',
      configurable: true,
      listedInNavigation: true,
      dataSource: 'site-sections',
      editorArea: 'content',
    };
  }

  private createPortfolioPage(config: SiteConfigV1): SitePageDefinition {
    const hasPortfolioContent = config.portfolioCategories.length > 0 || config.projects.length > 0;

    return {
      technicalId: 'portfolio-index-page',
      name: $localize`:@@admin.pages.portfolio.name:Página de portfólio`,
      description: $localize`:@@admin.pages.portfolio.description:Entrada fixa que lista categorias e projetos publicados.`,
      route: '/portfolio',
      routePattern: '/portfolio',
      kind: 'concrete-page',
      routeKind: 'fixed',
      group: 'concrete-pages',
      groupLabel: CONCRETE_PAGES_GROUP,
      order: 20,
      status: hasPortfolioContent ? 'available' : 'empty',
      configurable: true,
      listedInNavigation: this.hasNavigationRoute(config, '/portfolio'),
      dataSource: 'portfolio-index',
      editorArea: 'projects',
    };
  }

  private createCategoryTemplate(config: SiteConfigV1): SitePageDefinition {
    return {
      technicalId: 'portfolio-category-template',
      name: $localize`:@@admin.pages.categoryTemplate.name:Template de categoria do portfólio`,
      description: $localize`:@@admin.pages.categoryTemplate.description:Layout único reutilizado por todas as categorias; cada rota recebe os dados da categoria selecionada.`,
      route: '/portfolio/categoria/:categoryId',
      routePattern: '/portfolio/categoria/:categoryId',
      kind: 'shared-template',
      routeKind: 'parameterized',
      templateId: 'portfolio-category-template',
      group: 'shared-templates',
      groupLabel: SHARED_TEMPLATES_GROUP,
      order: 100,
      status: config.portfolioCategories.length > 0 ? 'available' : 'empty',
      configurable: true,
      listedInNavigation: false,
      dataSource: 'portfolio-categories',
      editorArea: 'projects',
    };
  }

  private createProjectTemplate(config: SiteConfigV1): SitePageDefinition {
    return {
      technicalId: 'portfolio-project-template',
      name: $localize`:@@admin.pages.projectTemplate.name:Template de detalhes do projeto`,
      description: $localize`:@@admin.pages.projectTemplate.description:Layout único que combina os dados, a galeria e as informações de cada projeto.`,
      route: '/portfolio/projeto/:slug',
      routePattern: '/portfolio/projeto/:slug',
      kind: 'shared-template',
      routeKind: 'parameterized',
      templateId: 'portfolio-project-template',
      group: 'shared-templates',
      groupLabel: SHARED_TEMPLATES_GROUP,
      order: 110,
      status: config.projects.length > 0 ? 'available' : 'empty',
      configurable: true,
      listedInNavigation: false,
      dataSource: 'portfolio-projects',
      editorArea: 'projects',
    };
  }

  private createCategoryData(config: SiteConfigV1): readonly SitePageDefinition[] {
    return config.portfolioCategories.map((category, index) => {
      const hasVisibleProjects = config.projects.some((project) =>
        project.visible && project.categoryIds.includes(category.id));

      return {
        technicalId: `portfolio-category-data:${category.id}`,
        sourceId: category.id,
        name: $localize`:@@admin.pages.categoryData.name:Categoria “${category.title}:categoryName:”`,
        description: category.description ||
          $localize`:@@admin.pages.categoryData.description:Dados desta categoria aplicados ao template compartilhado.`,
        route: `/portfolio/categoria/${this.toRouteSegment(category.id)}`,
        routePattern: '/portfolio/categoria/:categoryId',
        kind: 'dynamic-data',
        routeKind: 'dynamic',
        templateId: 'portfolio-category-template',
        group: 'dynamic-content',
        groupLabel: DYNAMIC_CONTENT_GROUP,
        order: 200 + index,
        status: hasVisibleProjects ? 'available' : 'empty',
        configurable: true,
        listedInNavigation: this.hasNavigationRoute(config, `/portfolio/categoria/${category.id}`),
        dataSource: 'portfolio-categories',
        editorArea: 'projects',
      } satisfies SitePageDefinition;
    });
  }

  private createProjectData(config: SiteConfigV1): readonly SitePageDefinition[] {
    return config.projects.map((project) => ({
      technicalId: `portfolio-project-data:${project.id}`,
      sourceId: project.id,
      name: $localize`:@@admin.pages.projectData.name:Projeto “${project.title}:projectName:”`,
      description: project.summary ||
        $localize`:@@admin.pages.projectData.description:Conteúdo e galeria deste projeto aplicados ao template compartilhado.`,
      route: `/portfolio/projeto/${this.toRouteSegment(project.slug)}`,
      routePattern: '/portfolio/projeto/:slug',
      kind: 'dynamic-data',
      routeKind: 'dynamic',
      templateId: 'portfolio-project-template',
      group: 'dynamic-content',
      groupLabel: DYNAMIC_CONTENT_GROUP,
      order: 300 + project.order,
      status: project.visible ? 'available' : 'hidden',
      configurable: true,
      listedInNavigation: this.hasNavigationRoute(config, `/portfolio/projeto/${project.slug}`),
      dataSource: 'portfolio-projects',
      editorArea: 'projects',
    }));
  }

  private createNotFoundPage(): SitePageDefinition {
    return {
      technicalId: 'not-found-page',
      name: $localize`:@@admin.pages.notFound.name:Página não encontrada (404)`,
      description: $localize`:@@admin.pages.notFound.description:Fallback do roteador exibido para qualquer endereço público sem correspondência.`,
      route: '/**',
      routePattern: '/**',
      kind: 'system-page',
      routeKind: 'fallback',
      group: 'system-pages',
      groupLabel: SYSTEM_PAGES_GROUP,
      order: 400,
      status: 'available',
      configurable: false,
      listedInNavigation: false,
      dataSource: 'router',
      editorArea: 'system',
    };
  }

  private removeIdentifierConflicts(
    pages: readonly SitePageDefinition[],
  ): readonly SitePageDefinition[] {
    const technicalIds = new Set<string>();
    const dynamicRoutes = new Set<string>();

    return pages.filter((page) => {
      if (technicalIds.has(page.technicalId))
        return false;

      if (page.kind === 'dynamic-data' && dynamicRoutes.has(page.route))
        return false;

      technicalIds.add(page.technicalId);

      if (page.kind === 'dynamic-data')
        dynamicRoutes.add(page.route);

      return true;
    });
  }

  private comparePages(first: SitePageDefinition, second: SitePageDefinition): number {
    const groupOrder: readonly SitePageDefinition['group'][] = [
      'concrete-pages',
      'shared-templates',
      'dynamic-content',
      'system-pages',
    ];
    const groupDifference = groupOrder.indexOf(first.group) - groupOrder.indexOf(second.group);

    if (groupDifference !== 0)
      return groupDifference;

    const orderDifference = first.order - second.order;

    if (orderDifference !== 0)
      return orderDifference;

    return first.name.localeCompare(second.name, 'pt-BR');
  }

  private normalizeRoute(route: string): string {
    const path = route.trim().split(/[?#]/, 1)[0] ?? '';

    if (!path.startsWith('/'))
      return '';

    return path.length > 1 ? path.replace(/\/+$/, '') : path;
  }

  private toRouteSegment(value: string): string {
    return encodeURIComponent(value.trim());
  }

  private hasNavigationRoute(config: SiteConfigV1, route: string): boolean {
    return config.navigationItems.some((item) => this.normalizeNavigationHref(item.href) === route);
  }

  private normalizeNavigationHref(href: string): string {
    const normalizedHref = href.trim().split(/[?#]/, 1)[0] ?? '';

    return normalizedHref.startsWith('/') ? normalizedHref : '';
  }
}
