import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  input,
  output,
  signal,
} from '@angular/core';

import { VisualBuilderBlockDrag } from '../../models/visual-builder-block-drag.model';
import { VisualBuilderBlockKind } from '../../models/visual-builder-block-kind.type';
import { VisualBuilderBlock } from '../../models/visual-builder-block.model';
import { VisualBuilderBlockVariation } from '../../models/visual-builder-block-variation.model';

@Component({
  selector: 'app-visual-builder-library',
  standalone: false,
  templateUrl: './visual-builder-library.component.html',
  styleUrl: './visual-builder-library.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisualBuilderLibraryComponent {
  @ViewChild('layersHost', { static: true })
  public layersHost!: ElementRef<HTMLElement>;

  public readonly blocks = input.required<readonly VisualBuilderBlock[]>();
  public readonly blockAdd = output<VisualBuilderBlock>();
  public readonly blockDragStart = output<VisualBuilderBlockDrag>();
  public readonly blockDragEnd = output<void>();

  protected readonly query = signal('');
  protected readonly activeView = signal<'blocks' | 'layers'>('blocks');
  protected readonly activeKind = signal<'all' | VisualBuilderBlockKind>('all');
  protected readonly expandedVariationBlockIds = signal<ReadonlySet<string>>(new Set<string>());
  protected readonly actionStatus = signal('');
  protected readonly kindFilters: readonly {
    readonly value: 'all' | VisualBuilderBlockKind;
    readonly label: string;
    readonly icon: string;
  }[] = [
    { value: 'all', label: $localize`:@@admin.visualBuilder.kind.all:Todos`, icon: 'pi-th-large' },
    { value: 'basic', label: $localize`:@@admin.visualBuilder.kind.basic:Elementos`, icon: 'pi-stop' },
    { value: 'layout', label: $localize`:@@admin.visualBuilder.kind.layout:Layouts`, icon: 'pi-table' },
    { value: 'section', label: $localize`:@@admin.visualBuilder.kind.section:Seções`, icon: 'pi-window-maximize' },
    { value: 'global', label: $localize`:@@admin.visualBuilder.kind.global:Globais`, icon: 'pi-globe' },
  ];
  private readonly searchableContentByBlockId = computed(() => new Map(
    this.blocks().map((block) => [
      block.id,
      [
        block.label,
        block.description,
        block.category.label,
        ...block.configurableFields,
        ...block.keywords,
        ...block.variations.flatMap((variation) => [variation.label, variation.description]),
      ].join(' ').toLocaleLowerCase('pt-BR'),
    ]),
  ));
  protected readonly filteredCategories = computed(() => {
    const query = this.query().trim().toLocaleLowerCase('pt-BR');
    const kind = this.activeKind();
    const searchableContentByBlockId = this.searchableContentByBlockId();
    const filteredBlocks = this.blocks()
      .filter((block) => kind === 'all' || block.kind === kind)
      .filter((block) => !query || searchableContentByBlockId.get(block.id)?.includes(query));
    const categories = new Map<string, {
      readonly category: VisualBuilderBlock['category'];
      readonly blocks: VisualBuilderBlock[];
    }>();

    for (const block of filteredBlocks) {
      const group = categories.get(block.category.id);

      categories.set(block.category.id, {
        category: block.category,
        blocks: [...(group?.blocks ?? []), block],
      });
    }

    return [...categories.values()]
      .sort((first, second) => first.category.order - second.category.order);
  });
  protected readonly visibleBlockCount = computed(() => this.filteredCategories()
    .reduce((total, category) => total + category.blocks.length, 0));

  protected handleSearch(event: Event): void {
    if (!(event.target instanceof HTMLInputElement))
      return;

    this.query.set(event.target.value);
  }

  protected handleDragStart(block: VisualBuilderBlock, event: DragEvent): void {
    const source = event.currentTarget;

    if (source instanceof HTMLElement && event.dataTransfer) {
      const preview = source.cloneNode(true);

      if (preview instanceof HTMLElement) {
        preview.classList.add('visual-builder-block-card--drag-preview');
        preview.setAttribute('aria-hidden', 'true');
        document.body.append(preview);
        event.dataTransfer.setDragImage(preview, 28, 28);
        setTimeout(() => preview.remove());
      }
    }

    this.blockDragStart.emit({ block, event });
  }

  protected handleCardClick(block: VisualBuilderBlock, event: MouseEvent): void {
    const target = event.target;

    if (!(target instanceof Element) || target.closest('button, details'))
      return;

    this.addVariation(block);
  }

  protected handleCardKeydown(block: VisualBuilderBlock, event: KeyboardEvent): void {
    if (event.target !== event.currentTarget || !['Enter', ' '].includes(event.key))
      return;

    event.preventDefault();
    this.addVariation(block);
  }

  protected handleTabKeydown(event: KeyboardEvent): void {
    const views: readonly ('blocks' | 'layers')[] = ['blocks', 'layers'];
    const currentIndex = views.indexOf(this.activeView());
    let targetIndex: number | null = null;

    if (event.key === 'ArrowRight')
      targetIndex = (currentIndex + 1) % views.length;
    else if (event.key === 'ArrowLeft')
      targetIndex = (currentIndex - 1 + views.length) % views.length;
    else if (event.key === 'Home')
      targetIndex = 0;
    else if (event.key === 'End')
      targetIndex = views.length - 1;

    if (targetIndex === null)
      return;

    event.preventDefault();
    const view = views[targetIndex];

    this.activeView.set(view);
    const tab = (event.currentTarget as HTMLElement)
      .closest('.visual-builder-library-tabs')
      ?.querySelector<HTMLButtonElement>(`#visual-builder-${view}-tab`);
    tab?.focus();
  }

  protected handleVariationToggle(blockId: string, event: Event): void {
    const details = event.currentTarget;

    if (!(details instanceof HTMLDetailsElement))
      return;

    this.expandedVariationBlockIds.update((currentIds) => {
      const nextIds = new Set(currentIds);

      if (details.open)
        nextIds.add(blockId);
      else
        nextIds.delete(blockId);

      return nextIds;
    });
  }

  protected addVariation(block: VisualBuilderBlock, variation?: VisualBuilderBlockVariation): void {
    if (!variation?.content) {
      this.blockAdd.emit(block);
      this.announceAddition(block.label);
      return;
    }

    this.blockAdd.emit({ ...block, content: variation.content });
    this.announceAddition(`${block.label}: ${variation.label}`);
  }

  protected kindLabel(kind: VisualBuilderBlockKind): string {
    return this.kindFilters.find((filter) => filter.value === kind)?.label ?? '';
  }

  private announceAddition(label: string): void {
    this.actionStatus.set(
      $localize`:@@admin.visualBuilder.blockAdded:${label}:BLOCK_LABEL: adicionado à página.`,
    );
  }
}
