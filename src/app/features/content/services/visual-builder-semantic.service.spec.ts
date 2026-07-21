import type { Component as GrapesComponent } from 'grapesjs';

import { VisualBuilderSemanticService } from './visual-builder-semantic.service';

describe('VisualBuilderSemanticService', () => {
  let service: VisualBuilderSemanticService;

  beforeEach(() => {
    service = new VisualBuilderSemanticService();
  });

  it('names the main architecture sections from their function', () => {
    expect(service.getComponentName(createComponent({ tagName: 'section', classes: ['lc-architectural-hero'] })))
      .toBe('Banner principal');
    expect(service.getComponentName(createComponent({ tagName: 'section', classes: ['lc-public-about'] })))
      .toBe('Perfil do arquiteto');
    expect(service.getComponentName(createComponent({ tagName: 'section', classes: ['lc-featured-project'] })))
      .toBe('Projeto em destaque');
    expect(service.getComponentName(createComponent({ tagName: 'section', classes: ['lc-budget-layout'] })))
      .toBe('Chamada para orçamento');
  });

  it('exposes text, link, image and background fields for simplified section editing', () => {
    const heading = createComponent({ id: 'hero-title', tagName: 'h1', html: 'Espaços que permanecem.' });
    const image = createComponent({
      id: 'hero-image',
      tagName: 'img',
      attributes: { alt: 'Casa integrada à paisagem', src: '/media/hero.webp' },
    });
    const link = createComponent({
      id: 'hero-link',
      tagName: 'a',
      html: 'Explorar portfólio',
      attributes: { href: '#portfolio' },
    });
    const background = createComponent({
      id: 'hero-background',
      styles: { 'background-image': "url('/media/background.webp')" },
    });
    const hero = createComponent({
      id: 'hero',
      tagName: 'section',
      classes: ['lc-architectural-hero'],
      children: [heading, image, link, background],
    });
    const fields = service.getSectionFields(hero);

    expect(fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ componentId: 'hero-title', property: 'text' }),
      expect.objectContaining({ componentId: 'hero-image', property: 'src', value: '/media/hero.webp' }),
      expect.objectContaining({ componentId: 'hero-link', property: 'href', value: '#portfolio' }),
      expect.objectContaining({
        componentId: 'hero-background',
        property: 'backgroundImage',
        value: '/media/background.webp',
      }),
    ]));
  });

  it('updates dynamic labels without changing the component id', () => {
    const heading = createComponent({ id: 'stable-title-id', tagName: 'h2', html: 'Primeiro título' });

    service.applyTreeMetadata(heading);
    expect(heading.getName()).toBe('Título “Primeiro título”');

    (heading as GrapesComponent & { setTestHtml(value: string): void }).setTestHtml('Título atualizado');
    service.refreshComponentName(heading);

    expect(heading.getName()).toBe('Título “Título atualizado”');
    expect(heading.getId()).toBe('stable-title-id');
  });

  it('starts sections collapsed and gives their children functional names', () => {
    const button = createComponent({
      id: 'cta-button',
      tagName: 'a',
      classes: ['lc-button'],
      html: 'Solicitar orçamento',
    });
    const section = createComponent({
      id: 'cta',
      tagName: 'section',
      classes: ['lc-budget-layout'],
      children: [button],
    });

    service.applyTreeMetadata(section);

    expect(section.get('open')).toBe(false);
    expect(button.getName()).toBe('Botão “Solicitar orçamento”');
  });
});

function createComponent(options: {
  readonly id?: string;
  readonly tagName?: string;
  readonly classes?: readonly string[];
  readonly attributes?: Readonly<Record<string, string>>;
  readonly styles?: Readonly<Record<string, string>>;
  readonly html?: string;
  readonly children?: readonly GrapesComponent[];
}): GrapesComponent {
  let html = options.html ?? '';
  const state: Record<string, unknown> = { tagName: options.tagName ?? 'div' };
  const children = [...(options.children ?? [])];
  const component = {
    get: (name: string) => state[name],
    set: (name: string, value: unknown) => {
      state[name] = value;
    },
    getId: () => options.id ?? 'component-id',
    getName: () => String(state['name'] ?? ''),
    setName: (name: string) => {
      state['name'] = name;
    },
    getAttributes: () => ({ ...(options.attributes ?? {}) }),
    getStyle: () => ({ ...(options.styles ?? {}) }),
    getClasses: () => [...(options.classes ?? [])],
    getInnerHTML: () => html,
    components: () => ({
      models: children,
      forEach: (callback: (child: GrapesComponent) => void) => children.forEach(callback),
    }),
    parent: () => null,
    setTestHtml: (value: string) => {
      html = value;
    },
  };

  return component as unknown as GrapesComponent;
}
