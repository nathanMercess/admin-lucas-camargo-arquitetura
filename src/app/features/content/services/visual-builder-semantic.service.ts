import { Injectable } from '@angular/core';
import type { Component as GrapesComponent } from 'grapesjs';

import { VisualBuilderSectionField } from '../models/visual-builder-section-field.model';

@Injectable({ providedIn: 'root' })
export class VisualBuilderSemanticService {
  private readonly textTags = new Set([
    'a',
    'button',
    'blockquote',
    'cite',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'small',
    'span',
    'strong',
  ]);

  public applyTreeMetadata(component: GrapesComponent, root = true): void {
    component.setName(this.getComponentName(component));

    if (this.isSection(component) && typeof component.set === 'function')
      component.set('open', false);

    component.components().forEach((child: GrapesComponent) => this.applyTreeMetadata(child, false));

    if (root && this.isPage(component) && typeof component.set === 'function')
      component.set('open', true);
  }

  public refreshComponentName(component: GrapesComponent): void {
    component.setName(this.getComponentName(component));

    const parent = component.parent();

    if (parent && !this.isPage(parent))
      parent.setName(this.getComponentName(parent));
  }

  public getComponentName(component: GrapesComponent): string {
    const attributes = component.getAttributes();
    const tagName = this.tagName(component);
    const classes = this.classNames(component);
    const explicitLabel = this.cleanText(String(attributes['data-builder-label'] ?? ''));
    const text = this.componentText(component);
    const excerpt = this.excerpt(text || String(attributes['alt'] ?? ''));

    if (explicitLabel && !this.isGenericLabel(explicitLabel))
      return explicitLabel;

    if (this.isPage(component))
      return $localize`:@@admin.visualBuilder.tree.page:Página`;

    if (this.isSection(component)) {
      const sectionLabel = this.sectionLabel(classes);

      if (sectionLabel)
        return sectionLabel;

      const heading = this.findFirstHeading(component);

      return heading
        ? $localize`:@@admin.visualBuilder.tree.namedSection:Seção “${this.excerpt(heading)}:sectionTitle:”`
        : $localize`:@@admin.visualBuilder.tree.section:Seção editorial`;
    }

    if (/^h[1-6]$/.test(tagName))
      return $localize`:@@admin.visualBuilder.tree.heading:Título “${excerpt}:heading:”`;

    if (tagName === 'button' || (tagName === 'a' && this.hasAnyClass(classes, ['button', 'cta'])))
      return $localize`:@@admin.visualBuilder.tree.button:Botão “${excerpt}:button:”`;

    if (tagName === 'a')
      return $localize`:@@admin.visualBuilder.tree.link:Link “${excerpt}:link:”`;

    if (tagName === 'img')
      return $localize`:@@admin.visualBuilder.tree.image:Imagem “${excerpt || 'sem descrição'}:image:”`;

    if (tagName === 'video')
      return $localize`:@@admin.visualBuilder.tree.video:Vídeo`;

    if (tagName === 'header')
      return $localize`:@@admin.visualBuilder.tree.header:Cabeçalho da página`;

    if (tagName === 'footer')
      return $localize`:@@admin.visualBuilder.tree.footer:Rodapé da página`;

    if (tagName === 'nav')
      return $localize`:@@admin.visualBuilder.tree.navigation:Menu de navegação`;

    if (tagName === 'form')
      return $localize`:@@admin.visualBuilder.tree.form:Campos do formulário`;

    if (tagName === 'article' || tagName === 'figure') {
      const heading = this.findFirstHeading(component) || text;

      return heading
        ? $localize`:@@admin.visualBuilder.tree.item:Item “${this.excerpt(heading)}:item:”`
        : $localize`:@@admin.visualBuilder.tree.editorialItem:Item editorial`;
    }

    if (this.textTags.has(tagName))
      return this.textLabel(classes, excerpt);

    return this.containerLabel(classes, component);
  }

  public isSection(component: GrapesComponent): boolean {
    const tagName = this.tagName(component);

    return ['footer', 'header', 'section'].includes(tagName)
      || component.getAttributes()['data-builder-section'] === 'true';
  }

  public getSectionFields(component: GrapesComponent): readonly VisualBuilderSectionField[] {
    if (!this.isSection(component))
      return [];

    const fields: VisualBuilderSectionField[] = [];

    this.collectFields(component, fields);

    return fields.slice(0, 24);
  }

  private collectFields(component: GrapesComponent, fields: VisualBuilderSectionField[]): void {
    if (component.getAttributes()['aria-hidden'] === 'true')
      return;

    const tagName = this.tagName(component);
    const componentId = component.getId();
    const label = this.getComponentName(component);
    const attributes = component.getAttributes();
    const styles = component.getStyle();

    if (this.textTags.has(tagName) && this.componentText(component)) {
      fields.push({
        id: `${componentId}-text`,
        componentId,
        label,
        property: 'text',
        type: 'text',
        value: this.componentText(component),
      });
    }

    if (tagName === 'a') {
      fields.push({
        id: `${componentId}-href`,
        componentId,
        label: $localize`:@@admin.visualBuilder.sectionField.destination:Destino de ${label}:elementLabel:`,
        property: 'href',
        type: 'link',
        value: String(attributes['href'] ?? ''),
      });
    }

    if (['img', 'video'].includes(tagName)) {
      fields.push({
        id: `${componentId}-src`,
        componentId,
        label,
        property: 'src',
        type: 'media',
        value: String(attributes['src'] ?? ''),
      });
    }

    const backgroundImage = String(styles['background-image'] ?? '');

    if (backgroundImage && backgroundImage !== 'none') {
      fields.push({
        id: `${componentId}-background`,
        componentId,
        label: $localize`:@@admin.visualBuilder.sectionField.background:Imagem de fundo de ${label}:elementLabel:`,
        property: 'backgroundImage',
        type: 'media',
        value: this.extractCssUrl(backgroundImage),
      });
    }

    component.components().forEach((child: GrapesComponent) => this.collectFields(child, fields));
  }

  private tagName(component: GrapesComponent): string {
    return String(component.get('tagName') ?? 'div').toLowerCase();
  }

  private classNames(component: GrapesComponent): readonly string[] {
    const getClasses = component.getClasses;

    if (typeof getClasses !== 'function')
      return [];

    return getClasses.call(component).map((className: unknown) => String(className));
  }

  private isPage(component: GrapesComponent): boolean {
    return this.classNames(component).includes('lc-page');
  }

  private sectionLabel(classes: readonly string[]): string {
    const mappings: readonly [string, string][] = [
      ['architectural-hero', $localize`:@@admin.visualBuilder.tree.hero:Banner principal`],
      ['public-manifesto', $localize`:@@admin.visualBuilder.tree.manifesto:Manifesto do escritório`],
      ['public-practice', $localize`:@@admin.visualBuilder.tree.practice:Áreas de atuação`],
      ['public-portfolio', $localize`:@@admin.visualBuilder.tree.portfolio:Portfólio de projetos`],
      ['featured-project', $localize`:@@admin.visualBuilder.tree.featuredProject:Projeto em destaque`],
      ['public-metrics', $localize`:@@admin.visualBuilder.tree.metrics:Números do escritório`],
      ['public-about', $localize`:@@admin.visualBuilder.tree.about:Perfil do arquiteto`],
      ['profile-layout', $localize`:@@admin.visualBuilder.tree.about:Perfil do arquiteto`],
      ['public-process', $localize`:@@admin.visualBuilder.tree.process:Processo de trabalho`],
      ['public-contact', $localize`:@@admin.visualBuilder.tree.contact:Chamada para contato`],
      ['budget-layout', $localize`:@@admin.visualBuilder.tree.budget:Chamada para orçamento`],
      ['form-section', $localize`:@@admin.visualBuilder.tree.contactForm:Formulário de contato`],
      ['project-gallery', $localize`:@@admin.visualBuilder.tree.projectGallery:Galeria de projetos`],
    ];

    return mappings.find(([classFragment]) => this.hasAnyClass(classes, [classFragment]))?.[1] ?? '';
  }

  private containerLabel(classes: readonly string[], component: GrapesComponent): string {
    const mappings: readonly [string, string][] = [
      ['hero-content', $localize`:@@admin.visualBuilder.tree.heroContent:Conteúdo do banner`],
      ['hero-bottom', $localize`:@@admin.visualBuilder.tree.heroActions:Texto e ação do banner`],
      ['about-visual', $localize`:@@admin.visualBuilder.tree.portrait:Retrato do arquiteto`],
      ['about-content', $localize`:@@admin.visualBuilder.tree.biography:Biografia do arquiteto`],
      ['portfolio-accordion', $localize`:@@admin.visualBuilder.tree.projectCategories:Categorias de projetos`],
      ['metric-grid', $localize`:@@admin.visualBuilder.tree.metricList:Lista de indicadores`],
      ['process-grid', $localize`:@@admin.visualBuilder.tree.processSteps:Etapas do processo`],
      ['contact-list', $localize`:@@admin.visualBuilder.tree.contactChannels:Canais de contato`],
      ['gallery', $localize`:@@admin.visualBuilder.tree.gallery:Imagens da galeria`],
      ['navigation', $localize`:@@admin.visualBuilder.tree.navigation:Menu de navegação`],
    ];
    const mapped = mappings.find(([classFragment]) => this.hasAnyClass(classes, [classFragment]))?.[1];

    if (mapped)
      return mapped;

    const heading = this.findFirstHeading(component);

    return heading
      ? $localize`:@@admin.visualBuilder.tree.group:Grupo “${this.excerpt(heading)}:group:”`
      : $localize`:@@admin.visualBuilder.tree.contentGroup:Grupo de conteúdo`;
  }

  private textLabel(classes: readonly string[], excerpt: string): string {
    if (this.hasAnyClass(classes, ['overline', 'eyebrow']))
      return $localize`:@@admin.visualBuilder.tree.overline:Chamada “${excerpt}:overline:”`;

    if (this.hasAnyClass(classes, ['index']))
      return $localize`:@@admin.visualBuilder.tree.index:Índice “${excerpt}:index:”`;

    if (this.hasAnyClass(classes, ['caption', 'reference']))
      return $localize`:@@admin.visualBuilder.tree.caption:Legenda “${excerpt}:caption:”`;

    return $localize`:@@admin.visualBuilder.tree.text:Texto “${excerpt}:text:”`;
  }

  private hasAnyClass(classes: readonly string[], fragments: readonly string[]): boolean {
    return classes.some((className) => fragments.some((fragment) => className.includes(fragment)));
  }

  private findFirstHeading(component: GrapesComponent): string {
    for (const child of component.components().models) {
      if (/^h[1-6]$/.test(this.tagName(child)))
        return this.componentText(child);

      const nestedHeading = this.findFirstHeading(child);

      if (nestedHeading)
        return nestedHeading;
    }

    return '';
  }

  private componentText(component: GrapesComponent): string {
    const getInnerHtml = component.getInnerHTML;

    return typeof getInnerHtml === 'function'
      ? this.cleanText(getInnerHtml.call(component))
      : '';
  }

  private cleanText(value: string): string {
    return value
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#0?39;/gi, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  private excerpt(value: string): string {
    const cleanValue = this.cleanText(value);

    if (cleanValue.length <= 38)
      return cleanValue;

    return `${cleanValue.slice(0, 35).trimEnd()}…`;
  }

  private isGenericLabel(label: string): boolean {
    return ['Bloco', 'Card', 'Componente', 'Conteúdo', 'Elemento', 'Item', 'Página', 'Seção'].includes(label);
  }

  private extractCssUrl(value: string): string {
    return value.match(/url\(["']?([^"')]+)["']?\)/i)?.[1] ?? '';
  }
}
