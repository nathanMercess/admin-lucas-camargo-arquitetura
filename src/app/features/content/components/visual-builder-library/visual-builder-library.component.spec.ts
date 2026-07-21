import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContentModule } from '../../content.module';
import { VisualBuilderBlock } from '../../models/visual-builder-block.model';
import { VisualBuilderCatalogService } from '../../services/visual-builder-catalog.service';
import { VisualBuilderLibraryComponent } from './visual-builder-library.component';

describe('VisualBuilderLibraryComponent', () => {
  let fixture: ComponentFixture<VisualBuilderLibraryComponent>;
  let blocks: readonly VisualBuilderBlock[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ContentModule] }).compileComponents();
    blocks = TestBed.inject(VisualBuilderCatalogService).blocks;
    fixture = TestBed.createComponent(VisualBuilderLibraryComponent);
    fixture.componentRef.setInput('blocks', blocks);
    fixture.detectChanges();
  });

  it('shows friendly categories and never exposes technical block ids', () => {
    const content = fixture.nativeElement.textContent as string;

    expect(content).toContain('Estrutura da página');
    expect(content).toContain('Projetos e portfólio');
    expect(content).toContain('Banner principal com imagem');
    expect(content).not.toContain('architecture-hero-banner');
    expect(content).not.toContain('project-gallery-grid');
  });

  it('shows the visual preview, configurable fields and motion capability for each card', () => {
    const card = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('.visual-builder-block-card')!;

    expect(card.querySelector('.visual-builder-block-thumbnail')?.getAttribute('data-preview')).toBeTruthy();
    expect(card.querySelector('.visual-builder-block-configurable')?.textContent).toContain('Editável');
    expect(card.querySelector('.visual-builder-block-motion')?.textContent).toContain('configurável');
  });

  it('filters the library by component kind', () => {
    const buttons = Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('.visual-builder-kind-filters button'),
    );
    const globalFilter = buttons.find((button) => button.textContent?.includes('Globais'));

    globalFilter?.click();
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent as string;
    expect(content).toContain('Cabeçalho transparente');
    expect(content).toContain('Rodapé com contatos e redes sociais');
    expect(content).not.toContain('Projeto em destaque');
  });

  it('adds the content belonging to a selected visual variation', () => {
    const emitted: VisualBuilderBlock[] = [];
    fixture.componentInstance.blockAdd.subscribe((block) => emitted.push(block));
    const cards = Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('.visual-builder-block-card'),
    );
    const columnsCard = cards.find((card) => card.textContent?.includes('Layout de texto e mídia'));
    const variationButtons = Array.from<HTMLButtonElement>(
      columnsCard?.querySelectorAll('.visual-builder-block-variations button') ?? [],
    );
    const mediaLeft = variationButtons.find((button) => button.textContent?.includes('Mídia à esquerda'));

    mediaLeft?.click();

    expect(emitted).toHaveLength(1);
    expect(emitted[0].content.indexOf('lc-image-placeholder'))
      .toBeLessThan(emitted[0].content.indexOf('DESTAQUE'));
  });

  it('adds a component by explicit button, card click and keyboard without requiring drag', () => {
    const emitted: VisualBuilderBlock[] = [];
    fixture.componentInstance.blockAdd.subscribe((block) => emitted.push(block));
    const card = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('.visual-builder-block-card')!;
    const addButton = card.querySelector<HTMLButtonElement>('.visual-builder-block-add')!;

    addButton.click();
    card.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(emitted).toHaveLength(3);
    expect(addButton.textContent).toContain('Adicionar');
    expect(card.getAttribute('tabindex')).toBe('0');
    expect(card.getAttribute('aria-describedby')).toContain('block-description-');
  });

  it('supports arrow-key tab navigation and exposes the related tab panels', () => {
    const rootElement = fixture.nativeElement as HTMLElement;
    const blocksTab = rootElement.querySelector<HTMLButtonElement>('#visual-builder-blocks-tab')!;

    blocksTab.focus();
    blocksTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();

    const layersTab = rootElement.querySelector<HTMLButtonElement>('#visual-builder-layers-tab')!;
    const layersPanel = rootElement.querySelector<HTMLElement>('#visual-builder-layers-panel')!;

    expect(layersTab.getAttribute('aria-selected')).toBe('true');
    expect(layersTab.getAttribute('aria-controls')).toBe(layersPanel.id);
    expect(document.activeElement).toBe(layersTab);
  });

  it('communicates search results and expanded variation state to assistive technology', () => {
    const rootElement = fixture.nativeElement as HTMLElement;
    const search = rootElement.querySelector<HTMLInputElement>('#visual-builder-block-search')!;

    expect(search.getAttribute('aria-describedby')).toBe('visual-builder-search-status');
    expect(rootElement.querySelector('#visual-builder-search-status')?.textContent).toContain('componentes disponíveis');

    const details = rootElement.querySelector<HTMLDetailsElement>('.visual-builder-block-variations')!;
    details.open = true;
    details.dispatchEvent(new Event('toggle'));
    fixture.detectChanges();

    expect(details.querySelector('summary')?.getAttribute('aria-expanded')).toBe('true');
  });
});
