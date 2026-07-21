import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MediaAsset } from '@shared/models/media-asset.model';
import { SiteConfigV1 } from '@shared/models/site-config-v1.model';
import { VisualBuilderDocument } from '@shared/models/visual-builder-document.model';
import { VisualBuilderRendererService } from '@shared/services/visual-builder-renderer.service';
import type { Component as GrapesComponent, Editor, ProjectData, StyleProps } from 'grapesjs';
import { ConfirmationService } from 'primeng/api';

import { VisualBuilderLibraryComponent } from '../visual-builder-library/visual-builder-library.component';
import { VisualBuilderBlockDrag } from '../../models/visual-builder-block-drag.model';
import { VisualBuilderBlock } from '../../models/visual-builder-block.model';
import { VisualBuilderDevice } from '../../models/visual-builder-device.type';
import { VisualBuilderMobilePanel } from '../../models/visual-builder-mobile-panel.type';
import { VisualBuilderPropertyChange } from '../../models/visual-builder-property-change.model';
import { VisualBuilderSelection } from '../../models/visual-builder-selection.model';
import { VisualBuilderTemplate } from '../../models/visual-builder-template.model';
import { VisualBuilderViewMode } from '../../models/visual-builder-view-mode.type';
import { VisualBuilderCatalogService } from '../../services/visual-builder-catalog.service';
import { VisualBuilderDocumentService } from '../../services/visual-builder-document.service';
import { VisualBuilderSemanticService } from '../../services/visual-builder-semantic.service';

@Component({
  selector: 'app-visual-page-builder',
  standalone: false,
  templateUrl: './visual-page-builder.component.html',
  styleUrl: './visual-page-builder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisualPageBuilderComponent implements AfterViewInit, OnDestroy {
  @ViewChild('builderRoot', { static: true })
  private readonly builderRoot!: ElementRef<HTMLElement>;

  @ViewChild('canvasFrame', { static: true })
  private readonly canvasFrame!: ElementRef<HTMLElement>;

  @ViewChild('editorHost', { static: true })
  private readonly editorHost!: ElementRef<HTMLElement>;

  @ViewChild(VisualBuilderLibraryComponent, { static: true })
  private readonly library!: VisualBuilderLibraryComponent;

  private readonly catalog = inject(VisualBuilderCatalogService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly documentService = inject(VisualBuilderDocumentService);
  private readonly renderer = inject(VisualBuilderRendererService);
  private readonly semantic = inject(VisualBuilderSemanticService);
  private editor: Editor | null = null;
  private emitTimer: ReturnType<typeof setTimeout> | null = null;
  private notificationTimer: ReturnType<typeof setTimeout> | null = null;
  private canvasResetTimer: ReturnType<typeof setTimeout> | null = null;
  private dragFinalizeTimer: ReturnType<typeof setTimeout> | null = null;
  private draggedBlock: VisualBuilderBlock | null = null;
  private dragSourceElement: HTMLElement | null = null;
  private dropPreview: GrapesComponent | null = null;
  private dropAllowed = true;
  private canvasDocument: Document | null = null;
  private canvasResizeObserver: ResizeObserver | null = null;
  private readonly handleCanvasDragOver = (event: DragEvent): void => this.moveDropPreview(event);
  private readonly handleCanvasDrop = (event: DragEvent): void => {
    if (this.dropAllowed)
      return;

    event.preventDefault();
    event.stopImmediatePropagation();
    this.cancelBlockDrag();
  };
  private readonly handleDocumentKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this.draggedBlock)
      return;

    event.preventDefault();
    this.cancelBlockDrag();
  };
  private readonly handleFullscreenChange = (): void => {
    this.fullscreen.set(document.fullscreenElement === this.builderRoot.nativeElement);
    this.scheduleCanvasReset(this.viewMode() === 'fit');
  };
  private readonly handleReducedMotionChange = (event: MediaQueryListEvent): void => {
    this.systemReducedMotion.set(event.matches);
    this.syncCanvasMotion();
  };
  private motionMediaQuery: MediaQueryList | null = null;
  private initialized = false;

  public readonly document = input<VisualBuilderDocument | undefined>();
  public readonly config = input.required<SiteConfigV1>();
  public readonly dirty = input(false);
  public readonly saving = input(false);
  public readonly saveError = input<string | null>(null);
  public readonly canPublish = input(false);
  public readonly documentChange = output<VisualBuilderDocument>();
  public readonly assetUploaded = output<MediaAsset>();
  public readonly save = output<void>();
  public readonly publish = output<void>();
  public readonly back = output<void>();

  protected readonly blocks = this.catalog.blocks;
  protected readonly loading = signal(true);
  protected readonly initializationError = signal<string | null>(null);
  protected readonly validationMessage = signal<string | null>(null);
  protected readonly selection = signal<VisualBuilderSelection | null>(null);
  private readonly detailedSectionId = signal<string | null>(null);
  protected readonly canUndo = signal(false);
  protected readonly canRedo = signal(false);
  protected readonly device = signal<VisualBuilderDevice>('desktop');
  protected readonly mobilePanel = signal<VisualBuilderMobilePanel>('canvas');
  protected readonly libraryPanelOpen = signal(false);
  protected readonly propertiesPanelOpen = signal(false);
  protected readonly focusMode = computed(() => !this.libraryPanelOpen() && !this.propertiesPanelOpen());
  protected readonly zoom = signal(100);
  protected readonly viewMode = signal<VisualBuilderViewMode>('fit');
  protected readonly fullscreen = signal(false);
  protected readonly previewVisible = signal(false);
  protected readonly templatesVisible = signal(false);
  protected readonly notification = signal<string | null>(null);
  protected readonly motionPlaying = signal(true);
  protected readonly motionSpeed = signal(1);
  protected readonly selectionAutoplay = signal(true);
  protected readonly systemReducedMotion = signal(false);
  private readonly forceReducedMotion = signal(false);
  protected readonly reducedMotion = computed(() =>
    this.systemReducedMotion() || this.forceReducedMotion(),
  );
  protected readonly currentDocument = signal<VisualBuilderDocument>({
    enabled: false,
    projectData: {},
    html: '',
    css: '',
  });
  protected readonly pageName = computed(() =>
    this.documentService.pageName(this.currentDocument()),
  );
  protected readonly templates = computed(() =>
    this.catalog.getTemplates(
      this.config(),
      this.documentService.savedTemplates(this.currentDocument()),
    ),
  );
  protected readonly previewWidth = computed(() => ({
    desktop: '100%',
    notebook: '1280px',
    tablet: '768px',
    mobile: '390px',
  })[this.device()]);

  public ngAfterViewInit(): void {
    this.observeCanvasSize();
    this.motionMediaQuery = this.getMediaQuery('(prefers-reduced-motion: reduce)');
    this.systemReducedMotion.set(this.motionMediaQuery?.matches ?? false);
    this.motionMediaQuery?.addEventListener('change', this.handleReducedMotionChange);
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    void this.initializeEditor();
  }

  public ngOnDestroy(): void {
    if (this.emitTimer)
      clearTimeout(this.emitTimer);
    if (this.notificationTimer)
      clearTimeout(this.notificationTimer);
    if (this.canvasResetTimer)
      clearTimeout(this.canvasResetTimer);
    if (this.dragFinalizeTimer)
      clearTimeout(this.dragFinalizeTimer);

    this.canvasDocument?.removeEventListener('dragover', this.handleCanvasDragOver);
    this.canvasDocument?.removeEventListener('drop', this.handleCanvasDrop, true);
    this.canvasResizeObserver?.disconnect();
    this.motionMediaQuery?.removeEventListener('change', this.handleReducedMotionChange);
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('keydown', this.handleDocumentKeyDown);
    this.clearDropPreview();

    this.editor?.destroy();
  }

  protected addBlock(block: VisualBuilderBlock): void {
    const editor = this.editor;
    const wrapper = editor?.getWrapper();

    if (!editor || !wrapper)
      return;

    const selected = editor.getSelected();
    const parent = selected?.parent();
    const destination = selected && parent ? parent : wrapper;
    const at = selected && parent ? selected.index() + 1 : undefined;
    const components = destination.append(block.content, at === undefined ? {} : { at });

    if (components[0])
      editor.select(components[0]);

    this.showNotification($localize`:@@admin.visualBuilder.blockAdded:${block.label}:blockLabel: adicionado à página.`);
  }

  protected startBlockDrag(payload: VisualBuilderBlockDrag): void {
    const block = this.editor?.Blocks.get(payload.block.id);

    if (!block)
      return;

    if (this.draggedBlock)
      this.cancelBlockDrag();

    if (this.dragFinalizeTimer) {
      clearTimeout(this.dragFinalizeTimer);
      this.dragFinalizeTimer = null;
    }

    this.draggedBlock = payload.block;
    this.dropAllowed = true;
    this.dragSourceElement = payload.event.currentTarget instanceof HTMLElement
      ? payload.event.currentTarget
      : null;
    this.dragSourceElement?.setAttribute('aria-grabbed', 'true');
    payload.event.dataTransfer?.setData('text/plain', payload.block.id);

    if (payload.event.dataTransfer) {
      payload.event.dataTransfer.effectAllowed = 'copy';
      this.hideFloatingDragImage(payload.event.dataTransfer);
    }

    this.createDropPreview(payload.block);
    this.editor?.Blocks.startDrag(block, payload.event);
  }

  protected endBlockDrag(): void {
    if (!this.draggedBlock)
      return;

    if (this.dragFinalizeTimer)
      clearTimeout(this.dragFinalizeTimer);

    this.editor?.Blocks.endDrag();

    if (!this.draggedBlock)
      return;

    this.dragFinalizeTimer = setTimeout(() => {
      this.completeBlockDrag(null);
      this.dragFinalizeTimer = null;
    });
  }

  protected undo(): void {
    this.editor?.UndoManager.undo();
    this.handleHistoryTraversal();
  }

  protected redo(): void {
    this.editor?.UndoManager.redo();
    this.handleHistoryTraversal();
  }

  protected setDevice(device: VisualBuilderDevice): void {
    this.device.set(device);
    this.editor?.setDevice(device);
    this.viewMode.set('fit');
    this.scheduleCanvasReset(true);
  }

  protected setZoom(value: number): void {
    this.viewMode.set(value === 100 ? 'actual' : 'custom');
    this.applyCanvasZoom(value);
  }

  protected changeZoom(offset: -5 | 5): void {
    this.setZoom(this.zoom() + offset);
  }

  protected fitCanvasToViewport(): void {
    this.viewMode.set('fit');
    this.scheduleCanvasReset(true);
  }

  protected showActualSize(): void {
    this.viewMode.set('actual');
    this.applyCanvasZoom(100);
  }

  protected centerCanvas(): void {
    this.scheduleCanvasReset(false);
  }

  protected setMobilePanel(panel: VisualBuilderMobilePanel): void {
    this.mobilePanel.set(panel);

    if (panel === 'canvas')
      this.scheduleCanvasReset(this.viewMode() === 'fit');
  }

  protected toggleFocusMode(): void {
    if (this.focusMode()) {
      this.libraryPanelOpen.set(true);
      this.propertiesPanelOpen.set(Boolean(this.selection()));
    } else {
      this.libraryPanelOpen.set(false);
      this.propertiesPanelOpen.set(false);
    }

    this.scheduleCanvasReset(this.viewMode() === 'fit');
  }

  protected toggleLibraryPanel(): void {
    this.libraryPanelOpen.update((open) => !open);
    this.scheduleCanvasReset(this.viewMode() === 'fit');
  }

  protected togglePropertiesPanel(): void {
    this.propertiesPanelOpen.update((open) => !open);
    this.scheduleCanvasReset(this.viewMode() === 'fit');
  }

  protected toggleMotionPlayback(): void {
    if (this.reducedMotion()) {
      this.showNotification(
        $localize`:@@admin.visualBuilder.motion.reduced:System preference for reduced motion is active.`,
      );
      return;
    }

    if (this.motionPlaying())
      this.pauseCanvasMotion();
    else
      this.playCanvasMotion();
  }

  protected restartCanvasMotion(): void {
    if (this.reducedMotion()) {
      this.showNotification(
        $localize`:@@admin.visualBuilder.motion.reduced:System preference for reduced motion is active.`,
      );
      return;
    }

    this.motionPlaying.set(true);
    this.setCanvasMotionPosition('start');
    this.playCanvasMotion();
  }

  protected showCanvasMotionStart(): void {
    this.setCanvasMotionPosition('start');
    this.pauseCanvasMotion();
    this.canvasDocument?.defaultView?.scrollTo({ top: 0, behavior: 'auto' });
  }

  protected showCanvasMotionEnd(): void {
    this.setCanvasMotionPosition('end');
    this.pauseCanvasMotion();
    const canvasDocument = this.canvasDocument;

    if (!canvasDocument)
      return;

    canvasDocument.defaultView?.scrollTo({
      top: Math.max(canvasDocument.body.scrollHeight, canvasDocument.documentElement.scrollHeight),
      behavior: 'auto',
    });
  }

  protected setMotionSpeed(value: number): void {
    const speed = [0.5, 1, 1.5, 2].includes(value) ? value : 1;

    this.motionSpeed.set(speed);
    this.syncCanvasMotion();
  }

  protected handleMotionSpeedChange(event: Event): void {
    if (!(event.target instanceof HTMLSelectElement))
      return;

    this.setMotionSpeed(Number(event.target.value));
  }

  protected toggleSelectionAutoplay(): void {
    this.selectionAutoplay.update((enabled) => !enabled);
  }

  protected replaySelectedMotion(): void {
    if (this.reducedMotion())
      return;

    const element = this.editor?.getSelected()?.getEl();

    if (!element) {
      this.showNotification($localize`:@@admin.visualBuilder.motion.selectFirst:Selecione um elemento com animação.`);
      return;
    }

    this.motionPlaying.set(true);
    this.restartAnimations(this.getCanvasAnimations(element));
  }

  protected toggleReducedMotion(): void {
    if (this.systemReducedMotion())
      return;

    this.forceReducedMotion.update((enabled) => !enabled);
    this.syncCanvasMotion();
  }

  protected async toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement === this.builderRoot.nativeElement)
        await document.exitFullscreen();
      else
        await this.builderRoot.nativeElement.requestFullscreen();
    } catch {
      this.showNotification(
        $localize`:@@admin.visualBuilder.fullscreenError:Não foi possível ativar a tela cheia neste navegador.`,
      );
    }
  }

  protected openPreview(): void {
    this.refreshDocument(false);
    this.previewVisible.set(true);
  }

  protected updatePageName(name: string): void {
    const updatedDocument = this.documentService.withPageName(this.currentDocument(), name);
    this.currentDocument.set(updatedDocument);
    this.documentChange.emit(updatedDocument);
  }

  protected updateEnabled(enabled: boolean): void {
    this.refreshDocument(false);
    const updatedDocument = this.documentService.withEnabled(this.currentDocument(), enabled);
    this.currentDocument.set(updatedDocument);
    this.documentChange.emit(updatedDocument);
  }

  protected applyProperty(change: VisualBuilderPropertyChange): void {
    const editor = this.editor;
    const selected = editor?.getSelected();
    const component = change.componentId
      ? editor?.Components.getById(change.componentId)
      : selected;

    if (!component || !selected)
      return;

    this.validationMessage.set(null);

    if (change.property === 'href' || change.property === 'src' || change.property === 'backgroundImage') {
      const value = String(change.value);

      if (!this.renderer.isSafeHref(value)) {
        this.validationMessage.set(
          $localize`:@@admin.visualBuilder.invalidUrl:Use um endereço HTTPS, uma âncora da página, telefone ou e-mail válido.`,
        );
        return;
      }

      if (change.property === 'backgroundImage')
        component.setStyle({ ...component.getStyle(), 'background-image': `url('${this.escapeCssUrl(value)}')` });
      else
        component.addAttributes({ [change.property]: value });
    } else if (change.property === 'alt') {
      component.addAttributes({ alt: String(change.value) });
    } else if (change.property === 'targetBlank') {
      if (change.value)
        component.addAttributes({ target: '_blank', rel: 'noopener noreferrer' });
      else
        component.removeAttributes(['target', 'rel']);
    } else if (change.property === 'displayMobile') {
      if (change.value)
        component.removeAttributes('data-hide-mobile');
      else
        component.addAttributes({ 'data-hide-mobile': 'true' });
    } else if (change.property === 'hidden') {
      if (change.value)
        component.addAttributes({ 'data-builder-hidden': 'true' });
      else
        component.removeAttributes('data-builder-hidden');
    } else if (change.property === 'variation') {
      if (change.value === 'default')
        component.removeAttributes('data-builder-variation');
      else
        component.addAttributes({ 'data-builder-variation': String(change.value) });
    } else if (change.property === 'animation') {
      if (change.value === 'none')
        component.removeAttributes('data-lc-animation');
      else
        component.addAttributes({ 'data-lc-animation': String(change.value) });
    } else if (change.property === 'text') {
      component.components(this.escapeHtml(String(change.value)));
    } else {
      this.applyStyle(component, change);
    }

    this.semantic.refreshComponentName(component);
    this.updateSelection(selected);
  }

  protected toggleInternalEditing(): void {
    const selected = this.editor?.getSelected();

    if (!selected || !this.semantic.isSection(selected))
      return;

    const detailed = this.detailedSectionId() !== selected.getId();

    this.detailedSectionId.set(detailed ? selected.getId() : null);
    selected.set('open', detailed);
    this.updateSelection(selected);
  }

  protected duplicateSelected(): void {
    const editor = this.editor;
    const selected = editor?.getSelected();
    const parent = selected?.parent();

    if (!editor || !selected || !parent)
      return;

    const [duplicate] = parent.append(selected.clone(), { at: selected.index() + 1 });

    if (duplicate)
      editor.select(duplicate);

    this.showNotification($localize`:@@admin.visualBuilder.duplicated:Elemento duplicado.`);
  }

  protected requestRemoveSelected(): void {
    const selected = this.editor?.getSelected();

    if (!selected || !selected.parent())
      return;

    this.confirmationService.confirm({
      header: $localize`:@@admin.visualBuilder.removeTitle:Excluir este elemento?`,
      message: $localize`:@@admin.visualBuilder.removeMessage:O elemento será removido da página. Você poderá desfazer esta ação enquanto continuar no editor.`,
      acceptLabel: $localize`:@@admin.visualBuilder.removeAccept:Excluir elemento`,
      rejectLabel: $localize`:@@admin.visualBuilder.removeReject:Manter elemento`,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        selected.remove();
        this.selection.set(null);
        this.showNotification($localize`:@@admin.visualBuilder.removed:Elemento removido. Use Ctrl + Z para desfazer.`);
      },
    });
  }

  protected moveSelected(offset: -1 | 1): void {
    const selected = this.editor?.getSelected();
    const parent = selected?.parent();

    if (!selected || !parent)
      return;

    const targetIndex = Math.max(0, Math.min(parent.components().length - 1, selected.index() + offset));

    if (targetIndex === selected.index())
      return;

    selected.move(parent, { at: targetIndex });
    this.editor?.select(selected);
  }

  protected requestTemplate(template: VisualBuilderTemplate): void {
    this.confirmationService.confirm({
      header: $localize`:@@admin.visualBuilder.replaceTitle:Usar este modelo?`,
      message: $localize`:@@admin.visualBuilder.replaceMessage:O conteúdo atual do editor será substituído por uma cópia do modelo. Salve antes se quiser preservar esta versão.`,
      acceptLabel: $localize`:@@admin.visualBuilder.replaceAccept:Usar uma cópia`,
      rejectLabel: $localize`:@@admin.visualBuilder.replaceReject:Cancelar`,
      accept: () => this.applyTemplate(template),
    });
  }

  protected saveCurrentAsTemplate(name: string): void {
    this.refreshDocument(false);
    const updatedDocument = this.documentService.saveAsTemplate(this.currentDocument(), name);

    this.currentDocument.set(updatedDocument);
    this.documentChange.emit(updatedDocument);
    this.showNotification($localize`:@@admin.visualBuilder.templateSaved:Modelo personalizado salvo.`);
  }

  private async initializeEditor(): Promise<void> {
    try {
      const grapesModule = await import('grapesjs');
      const existing = this.documentService.normalize(
        this.document(),
        $localize`:@@admin.visualBuilder.defaultPageName:Página inicial`,
      );
      const hasProjectData = this.documentService.hasEditableData(existing);

      this.currentDocument.set(existing ?? this.currentDocument());
      this.editor = grapesModule.default.init({
        container: this.editorHost.nativeElement,
        height: '100%',
        width: 'auto',
        storageManager: false,
        fromElement: false,
        panels: { defaults: [] },
        projectData: hasProjectData ? existing?.projectData as ProjectData : undefined,
        components: hasProjectData
          ? undefined
          : existing?.html || this.catalog.createStarterPage(this.config()),
        style: hasProjectData ? undefined : existing?.css || this.catalog.getBaseStyles(),
        blockManager: { custom: true },
        canvas: { scrollableCanvas: true },
        layerManager: {
          appendTo: this.library.layersHost.nativeElement,
          sortable: true,
          hidable: true,
          hideTextnode: true,
          showWrapper: false,
        },
        deviceManager: {
          devices: [
            { id: 'desktop', name: 'Computador', width: '1440px', height: '900px', widthMedia: '1440px' },
            { id: 'notebook', name: 'Notebook', width: '1280px', height: '800px', widthMedia: '1440px' },
            { id: 'tablet', name: 'Tablet', width: '768px', height: '1024px', widthMedia: '900px' },
            { id: 'mobile', name: 'Celular', width: '390px', height: '844px', widthMedia: '480px' },
          ],
        },
        selectorManager: { componentFirst: true },
        parser: {
          optionsHtml: {
            allowScripts: false,
            allowUnsafeAttr: false,
            allowUnsafeAttrValue: false,
          },
        },
        assetManager: {
          assets: this.config().media.map((asset) => ({
            id: asset.id,
            src: /^\/(?:assets|favicon\.ico|og\.png)/.test(asset.path)
              ? new URL(asset.path, this.config().identity.canonicalUrl).toString()
              : asset.path,
            name: asset.id,
            width: asset.width,
            height: asset.height,
          })),
        },
      });

      this.configureBlocks(this.editor);
      this.configureKeymaps(this.editor);
      this.configureEvents(this.editor);
      this.editor.onReady(() => {
        if (!this.editor)
          return;

        this.initialized = true;
        const wrapper = this.editor.getWrapper();

        if (wrapper)
          this.semantic.applyTreeMetadata(wrapper);

        this.editor.UndoManager.clear();
        this.editor.clearDirtyCount();
        const initialDevice: VisualBuilderDevice = this.mediaQueryMatches('(max-width: 780px)')
          ? 'mobile'
          : 'desktop';

        this.device.set(initialDevice);
        this.editor.setDevice(initialDevice);
        this.canvasDocument = this.editor.Canvas.getDocument();
        this.canvasDocument?.addEventListener('dragover', this.handleCanvasDragOver);
        this.canvasDocument?.addEventListener('drop', this.handleCanvasDrop, true);
        this.ensureCanvasDropFeedbackStyles();
        this.ensureCanvasMotionStyles();
        document.addEventListener('keydown', this.handleDocumentKeyDown);
        this.scheduleCanvasReset(true);
        requestAnimationFrame(() => this.syncCanvasMotion());
        this.refreshDocument(false);
        this.updateHistoryState();
        this.loading.set(false);
      });
    } catch {
      this.loading.set(false);
      this.initializationError.set(
        $localize`:@@admin.visualBuilder.loadError:Não foi possível abrir o editor visual. Recarregue a página e tente novamente.`,
      );
    }
  }

  private configureBlocks(editor: Editor): void {
    for (const block of this.blocks) {
      editor.Blocks.add(block.id, {
        label: block.label,
        category: block.category,
        content: block.content,
      });
    }
  }

  private configureEvents(editor: Editor): void {
    editor.on('update', () => {
      if (!this.initialized || this.draggedBlock || this.dropPreview)
        return;

      this.scheduleDocumentChange();
      this.updateHistoryState();
    });
    editor.on('component:selected', (component) => {
      this.updateSelection(component);

      if (this.selectionAutoplay() && !this.reducedMotion())
        requestAnimationFrame(() => this.replaySelectedMotion());

      if (!this.mediaQueryMatches('(max-width: 780px)')) {
        this.propertiesPanelOpen.set(true);
        this.scheduleCanvasReset(this.viewMode() === 'fit');
      }
    });
    editor.on('component:add', (component) => this.semantic.applyTreeMetadata(component));
    editor.on('component:update:content', (component) => this.semantic.refreshComponentName(component));
    editor.on('component:deselected', () => {
      this.selection.set(null);

      if (!this.mediaQueryMatches('(max-width: 780px)')) {
        this.propertiesPanelOpen.set(false);
        this.scheduleCanvasReset(this.viewMode() === 'fit');
      }
    });
    editor.on('undo', () => this.updateHistoryState());
    editor.on('redo', () => this.updateHistoryState());
    editor.on('block:drag:stop', (component) => this.completeBlockDrag(component ?? null));
  }

  private configureKeymaps(editor: Editor): void {
    editor.Keymaps.add('app:save', '⌘+s, ctrl+s', () => this.save.emit(), { prevent: true });
    editor.Keymaps.add('app:undo', '⌘+z, ctrl+z', () => this.undo(), { prevent: true });
    editor.Keymaps.add('app:redo', '⌘+shift+z, ctrl+shift+z', () => this.redo(), { prevent: true });
    editor.Keymaps.add('app:duplicate', '⌘+d, ctrl+d', () => this.duplicateSelected(), { prevent: true });
    editor.Keymaps.add('app:remove', 'delete, backspace', () => {
      if (this.isCanvasTextEditing())
        return;

      this.requestRemoveSelected();
    });
    editor.Keymaps.add('app:deselect', 'esc', () => {
      editor.select();
      this.selection.set(null);
    });
  }

  private scheduleDocumentChange(): void {
    if (this.emitTimer)
      clearTimeout(this.emitTimer);

    this.emitTimer = setTimeout(() => this.refreshDocument(true), 350);
  }

  private scheduleCanvasReset(fit: boolean): void {
    if (this.canvasResetTimer)
      clearTimeout(this.canvasResetTimer);

    this.canvasResetTimer = setTimeout(() => {
      const editor = this.editor;

      if (!editor) {
        this.canvasResetTimer = null;
        return;
      }

      if (fit) {
        editor.Canvas.fitViewport({
          gap: this.canvasGap(),
          zoom: (calculatedZoom) => this.clampZoom(Math.floor(calculatedZoom / 5) * 5),
        });
        this.zoom.set(Math.round(editor.Canvas.getZoom()));
      } else {
        editor.Canvas.fitViewport({ gap: this.canvasGap(), zoom: this.zoom() });
      }

      editor.Canvas.refresh({ all: true });
      this.canvasResetTimer = null;
    }, 120);
  }

  private applyCanvasZoom(value: number): void {
    const zoom = this.clampZoom(value);

    this.zoom.set(zoom);
    this.editor?.Canvas.fitViewport({ gap: this.canvasGap(), zoom });
    this.editor?.Canvas.refresh({ all: true });
  }

  private canvasGap(): { readonly x: number; readonly y: number } {
    const compact = this.canvasFrame.nativeElement.clientWidth < 620;

    return compact ? { x: 8, y: 8 } : { x: 20, y: 20 };
  }

  private clampZoom(value: number): number {
    return Math.max(25, Math.min(150, value));
  }

  private observeCanvasSize(): void {
    if (typeof ResizeObserver === 'undefined')
      return;

    this.canvasResizeObserver = new ResizeObserver(() => {
      if (!this.initialized)
        return;

      this.scheduleCanvasReset(this.viewMode() === 'fit');
    });
    this.canvasResizeObserver.observe(this.canvasFrame.nativeElement);
  }

  private createDropPreview(block: VisualBuilderBlock): void {
    const editor = this.editor;
    const wrapper = editor?.getWrapper();

    if (!editor || !wrapper)
      return;

    this.clearDropPreview();
    editor.UndoManager.skip(() => {
      const [preview] = wrapper.append(block.content);

      if (!preview)
        return;

      preview.addAttributes({
        'aria-hidden': 'true',
        'data-builder-label': `${block.label} — prévia`,
        'data-lc-drop-label': $localize`:@@admin.visualBuilder.drop.pageEnd:Depois do conteúdo atual`,
        'data-lc-drop-preview': 'true',
        'data-lc-drop-state': 'valid',
      });
      preview.setStyle({
        ...preview.getStyle(),
        filter: 'grayscale(.35)',
        opacity: '.38',
        outline: '2px dashed #e36571',
        'outline-offset': '-2px',
        'pointer-events': 'none',
      });
      preview.setName(`${block.label} — prévia`);
      this.dropPreview = preview;
    });
  }

  private moveDropPreview(event: DragEvent): void {
    const editor = this.editor;
    const wrapper = editor?.getWrapper();
    const preview = this.dropPreview;
    const targetElement = event.target;

    if (!editor || !wrapper || !preview || !this.isHtmlElement(targetElement))
      return;

    event.preventDefault();

    const identifiedElement = targetElement.closest<HTMLElement>('[id]');
    let target = identifiedElement ? editor.Components.getById(identifiedElement.id) : undefined;

    if (target && this.isSectionOrientedBlock() && this.isForbiddenSectionTarget(target)) {
      this.markDropInvalid(target);
      return;
    }

    while (target?.parent() && target.parent() !== wrapper)
      target = target.parent();

    if (!target || target === preview) {
      this.moveDropPreviewWithinWrapper(event.clientY, wrapper, preview);
      return;
    }

    const targetBox = target.getEl()?.getBoundingClientRect();
    const parent = target.parent();

    if (!targetBox || !parent)
      return;

    const after = event.clientY >= targetBox.top + targetBox.height / 2;
    const at = target.index() + (after ? 1 : 0);
    const targetName = this.getDropTargetName(target);
    const guidance = after
      ? $localize`:@@admin.visualBuilder.drop.after:Depois de ${targetName}:targetLabel:`
      : $localize`:@@admin.visualBuilder.drop.before:Antes de ${targetName}:targetLabel:`;

    this.moveDropPreviewTo(parent, at, guidance);
  }

  private moveDropPreviewWithinWrapper(
    pointerY: number,
    wrapper: GrapesComponent,
    preview: GrapesComponent,
  ): void {
    const siblings = wrapper.components().models.filter((component) => component !== preview);
    const nextComponent = siblings.find((component) => {
      const box = component.getEl()?.getBoundingClientRect();

      return Boolean(box && pointerY < box.top + box.height / 2);
    });
    const at = nextComponent?.index() ?? wrapper.components().length;
    const guidance = nextComponent
      ? $localize`:@@admin.visualBuilder.drop.before:Antes de ${this.getDropTargetName(nextComponent)}:targetLabel:`
      : $localize`:@@admin.visualBuilder.drop.pageEnd:Depois do conteúdo atual`;

    this.moveDropPreviewTo(wrapper, at, guidance);
  }

  private completeBlockDrag(component: GrapesComponent | null): void {
    const draggedBlock = this.draggedBlock;

    if (!draggedBlock)
      return;

    if (this.dragFinalizeTimer) {
      clearTimeout(this.dragFinalizeTimer);
      this.dragFinalizeTimer = null;
    }

    if (component && component !== this.dropPreview && this.dropAllowed) {
      this.placeDroppedComponent(component);
      this.semantic.applyTreeMetadata(component);
      this.editor?.select(component);
      this.highlightDroppedComponent(component);
    } else if (component && component !== this.dropPreview) {
      const rejectedComponent = component;

      this.editor?.UndoManager.skip(() => rejectedComponent.remove());
      component = null;
      this.clearDropPreview();
    } else {
      this.clearDropPreview();
    }

    this.finishDragSession();
    this.updateHistoryState();

    if (!component)
      return;

    this.refreshDocument(true);
    this.showNotification(
      $localize`:@@admin.visualBuilder.blockAdded:${draggedBlock.label}:blockLabel: adicionado \u00e0 p\u00e1gina.`,
    );
  }

  private placeDroppedComponent(component: GrapesComponent): void {
    const editor = this.editor;
    const preview = this.dropPreview;
    const destination = preview?.parent();

    if (!editor || !preview || !destination) {
      this.clearDropPreview();
      return;
    }

    const previewIndex = preview.index();
    const componentIndex = component.index();
    const componentParent = component.parent();
    const targetIndex = componentParent === destination && componentIndex < previewIndex
      ? previewIndex - 1
      : previewIndex;

    editor.UndoManager.skip(() => {
      preview.remove();
      this.dropPreview = null;

      if (component.parent() !== destination || component.index() !== targetIndex)
        component.move(destination, { at: targetIndex });
    });
  }

  private cancelBlockDrag(): void {
    if (!this.draggedBlock)
      return;

    this.editor?.Blocks.endDrag(true);

    if (this.draggedBlock)
      this.completeBlockDrag(null);
  }

  private hideFloatingDragImage(dataTransfer: DataTransfer): void {
    if (typeof dataTransfer.setDragImage !== 'function')
      return;

    const emptyImage = document.createElement('canvas');

    emptyImage.width = 1;
    emptyImage.height = 1;
    emptyImage.style.position = 'fixed';
    emptyImage.style.opacity = '0';
    emptyImage.style.pointerEvents = 'none';
    document.body.append(emptyImage);
    dataTransfer.setDragImage(emptyImage, 0, 0);
    setTimeout(() => emptyImage.remove());
  }

  private finishDragSession(): void {
    this.draggedBlock = null;
    this.dropAllowed = true;
    this.dragSourceElement?.removeAttribute('aria-grabbed');
    this.dragSourceElement = null;
  }

  private moveDropPreviewTo(
    destination: GrapesComponent,
    at: number,
    guidance: string,
  ): void {
    const preview = this.dropPreview;

    if (!preview)
      return;

    this.dropAllowed = true;
    preview.addAttributes({
      'data-lc-drop-label': guidance,
      'data-lc-drop-state': 'valid',
    });
    this.canvasFrame?.nativeElement.setAttribute('aria-label', guidance);

    if (preview.parent() === destination && preview.index() === at)
      return;

    this.editor?.UndoManager.skip(() => preview.move(destination, { at }));
  }

  private markDropInvalid(target: GrapesComponent): void {
    const preview = this.dropPreview;

    if (!preview)
      return;

    const targetName = this.getDropTargetName(target);
    const guidance = $localize`:@@admin.visualBuilder.drop.invalid:Não é possível inserir uma seção dentro de ${targetName}:targetLabel:. Posicione antes ou depois da seção.`;

    this.dropAllowed = false;
    preview.addAttributes({
      'data-lc-drop-label': guidance,
      'data-lc-drop-state': 'invalid',
    });
    this.canvasFrame?.nativeElement.setAttribute('aria-label', guidance);
  }

  private isSectionOrientedBlock(): boolean {
    return this.draggedBlock?.kind !== 'basic';
  }

  private isForbiddenSectionTarget(component: GrapesComponent): boolean {
    const tagName = String(component.get('tagName') ?? '').toLowerCase();

    return [
      'a',
      'button',
      'cite',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'input',
      'label',
      'p',
      'small',
      'span',
      'strong',
      'textarea',
    ].includes(tagName);
  }

  private getDropTargetName(component: GrapesComponent): string {
    const attributes = component.getAttributes();
    const tagName = String(component.get('tagName') ?? 'div').toLowerCase();

    return String(attributes['data-builder-label'] ?? this.getFriendlyElementName(tagName));
  }

  private highlightDroppedComponent(component: GrapesComponent): void {
    const element = component.getEl();

    if (!element)
      return;

    element.classList.add('lc-builder-drop-highlight');
    element.scrollIntoView({
      behavior: this.reducedMotion() ? 'auto' : 'smooth',
      block: 'center',
    });
    setTimeout(() => element.classList.remove('lc-builder-drop-highlight'), 1400);
  }

  private ensureCanvasDropFeedbackStyles(): void {
    const canvasDocument = this.canvasDocument;

    if (!canvasDocument || canvasDocument.getElementById('lc-builder-drop-feedback'))
      return;

    const style = canvasDocument.createElement('style');

    style.id = 'lc-builder-drop-feedback';
    style.textContent = `
      [data-lc-drop-preview="true"]{position:relative!important}
      [data-lc-drop-preview="true"]::before{position:absolute;z-index:2147483647;top:12px;left:12px;max-width:calc(100% - 24px);padding:8px 12px;color:#fff;background:#333332;content:attr(data-lc-drop-label);font:600 12px/1.35 sans-serif;letter-spacing:.02em;pointer-events:none}
      [data-lc-drop-preview="true"][data-lc-drop-state="invalid"]{filter:grayscale(1)!important;outline-color:#b42318!important}
      [data-lc-drop-preview="true"][data-lc-drop-state="invalid"]::before{background:#b42318}
      .lc-builder-drop-highlight{animation:lc-builder-drop-highlight 1.35s ease-out}
      @keyframes lc-builder-drop-highlight{0%,35%{outline:4px solid #e36571;outline-offset:-4px}100%{outline-color:transparent}}
      @media(prefers-reduced-motion:reduce){.lc-builder-drop-highlight{animation-duration:.01ms}}
    `;
    canvasDocument.head.append(style);
  }

  private ensureCanvasMotionStyles(): void {
    const canvasDocument = this.canvasDocument;

    if (!canvasDocument || canvasDocument.getElementById('lc-builder-motion-controls'))
      return;

    const style = canvasDocument.createElement('style');

    style.id = 'lc-builder-motion-controls';
    style.textContent = `
      html[data-lc-editor-motion-state="paused"] .lc-page *,html[data-lc-editor-motion-state="paused"] .lc-page *::before,html[data-lc-editor-motion-state="paused"] .lc-page *::after{animation-play-state:paused!important}
      html[data-lc-editor-reduced-motion="true"] .lc-page *,html[data-lc-editor-reduced-motion="true"] .lc-page *::before,html[data-lc-editor-reduced-motion="true"] .lc-page *::after{scroll-behavior:auto!important;animation:none!important;transition:none!important}
    `;
    canvasDocument.head.append(style);
  }

  private syncCanvasMotion(): void {
    const canvasDocument = this.canvasDocument;

    if (!canvasDocument)
      return;

    canvasDocument.documentElement.dataset['lcEditorMotionState'] = this.motionPlaying() && !this.reducedMotion()
      ? 'playing'
      : 'paused';
    canvasDocument.documentElement.dataset['lcEditorReducedMotion'] = String(this.reducedMotion());

    const animations = this.getCanvasAnimations();

    for (const animation of animations) {
      animation.playbackRate = this.motionSpeed();

      if (this.reducedMotion()) {
        this.setAnimationPosition(animation, 'end');
        animation.pause();
      } else if (this.motionPlaying()) {
        animation.play();
      } else {
        animation.pause();
      }
    }
  }

  private playCanvasMotion(): void {
    this.motionPlaying.set(true);
    this.syncCanvasMotion();
  }

  private pauseCanvasMotion(): void {
    this.motionPlaying.set(false);
    this.syncCanvasMotion();
  }

  private setCanvasMotionPosition(position: 'start' | 'end'): void {
    for (const animation of this.getCanvasAnimations())
      this.setAnimationPosition(animation, position);
  }

  private restartAnimations(animations: readonly Animation[]): void {
    for (const animation of animations) {
      animation.playbackRate = this.motionSpeed();
      this.setAnimationPosition(animation, 'start');
      animation.play();
    }
  }

  private setAnimationPosition(animation: Animation, position: 'start' | 'end'): void {
    if (position === 'start') {
      animation.currentTime = 0;
      return;
    }

    const endTime = animation.effect?.getComputedTiming().endTime;

    if (typeof endTime === 'number' && Number.isFinite(endTime))
      animation.currentTime = endTime;
  }

  private getCanvasAnimations(scope?: Element): Animation[] {
    const target = scope ?? this.canvasDocument;

    if (!target || typeof target.getAnimations !== 'function')
      return [];

    return target.getAnimations({ subtree: true });
  }

  private clearDropPreview(): void {
    const preview = this.dropPreview;

    if (!preview)
      return;

    this.editor?.UndoManager.skip(() => preview.remove());
    this.dropPreview = null;
  }

  private refreshDocument(emit: boolean): void {
    const editor = this.editor;

    if (!editor)
      return;

    const current = this.currentDocument();
    const editorHtml = editor.getHtml();
    const html = this.renderer.sanitizeHtml(
      /class=["'][^"']*\blc-page\b/.test(editorHtml)
        ? editorHtml
        : `<div class="lc-page">${editorHtml}</div>`,
    );
    const css = this.renderer.sanitizeCss(editor.getCss({ keepUnusedStyles: true }) ?? '');
    const updatedDocument = this.documentService.create(
      current,
      this.pageName(),
      editor.getProjectData() as Readonly<Record<string, unknown>>,
      html,
      css,
    );

    this.currentDocument.set(updatedDocument);

    if (emit)
      this.documentChange.emit(updatedDocument);
  }

  private updateSelection(component: GrapesComponent): void {
    const attributes = component.getAttributes();
    const styles = component.getStyle();
    const tagName = String(component.get('tagName') ?? 'div').toLowerCase();
    const canEditText = ['a', 'button', 'cite', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label', 'p', 'small', 'span', 'strong'].includes(tagName);
    const canEditLink = tagName === 'a';
    const canEditMedia = ['img', 'video'].includes(tagName);
    const textAlign = String(styles['text-align'] ?? 'left');
    const parent = component.parent();
    const index = component.index();
    const siblingCount = parent?.components().length ?? 0;

    this.selection.set({
      id: component.getId(),
      label: this.semantic.getComponentName(component),
      tagName,
      isSection: this.semantic.isSection(component),
      sectionFields: this.semantic.getSectionFields(component),
      detailedEditing: this.detailedSectionId() === component.getId(),
      canEditText,
      canEditLink,
      canEditMedia,
      text: canEditText ? this.renderer.extractText(component.getInnerHTML()) : '',
      href: String(attributes['href'] ?? ''),
      src: String(attributes['src'] ?? ''),
      alt: String(attributes['alt'] ?? ''),
      targetBlank: attributes['target'] === '_blank',
      color: this.styleValue(styles, 'color'),
      backgroundColor: this.styleValue(styles, 'background-color'),
      padding: this.numericStyle(styles, 'padding'),
      fontSize: this.numericStyle(styles, 'font-size', 16),
      width: this.numericStyle(styles, 'width', 100),
      borderRadius: this.numericStyle(styles, 'border-radius'),
      textAlign: ['left', 'center', 'right'].includes(textAlign)
        ? textAlign as 'left' | 'center' | 'right'
        : 'left',
      displayMobile: attributes['data-hide-mobile'] !== 'true',
      hidden: attributes['data-builder-hidden'] === 'true',
      canMoveUp: Boolean(parent && index > 0),
      canMoveDown: Boolean(parent && index >= 0 && index < siblingCount - 1),
      canRemove: Boolean(parent),
      variation: String(attributes['data-builder-variation'] ?? 'default'),
      animation: this.animationValue(attributes['data-lc-animation']),
      animationDelay: this.numericStyle(styles, '--lc-animation-delay'),
      animationDuration: this.numericStyle(styles, '--lc-animation-duration', 750),
    });
  }

  private applyStyle(component: GrapesComponent, change: VisualBuilderPropertyChange): void {
    const propertyMap: Partial<Record<VisualBuilderPropertyChange['property'], string>> = {
      backgroundColor: 'background-color',
      borderRadius: 'border-radius',
      color: 'color',
      fontSize: 'font-size',
      padding: 'padding',
      textAlign: 'text-align',
      width: 'width',
      animationDelay: '--lc-animation-delay',
      animationDuration: '--lc-animation-duration',
    };
    const cssProperty = propertyMap[change.property];

    if (!cssProperty)
      return;

    const numericProperties = new Set([
      'animationDelay',
      'animationDuration',
      'borderRadius',
      'fontSize',
      'padding',
    ]);
    const isAnimationTiming = ['animationDelay', 'animationDuration'].includes(change.property);
    const value = numericProperties.has(change.property)
      ? `${Number(change.value)}${isAnimationTiming ? 'ms' : 'px'}`
      : change.property === 'width'
        ? `${Number(change.value)}%`
        : String(change.value);

    component.setStyle({ ...component.getStyle(), [cssProperty]: value });
  }

  private animationValue(value: unknown): 'fade' | 'fade-up' | 'none' | 'reveal-left' | 'zoom' {
    const animation = String(value ?? 'none');

    if (['fade', 'fade-up', 'reveal-left', 'zoom'].includes(animation))
      return animation as 'fade' | 'fade-up' | 'reveal-left' | 'zoom';

    return 'none';
  }

  private applyTemplate(template: VisualBuilderTemplate): void {
    const editor = this.editor;

    if (!editor)
      return;

    if (template.projectData)
      editor.loadProjectData(structuredClone(template.projectData) as ProjectData);
    else {
      editor.setComponents(template.content ?? '');
      editor.setStyle(template.styles ?? this.catalog.getBaseStyles());
    }

    editor.select();
    this.selection.set(null);
    this.templatesVisible.set(false);
    this.refreshDocument(true);
    this.showNotification($localize`:@@admin.visualBuilder.templateApplied:Modelo aplicado. Revise a página antes de salvar.`);
  }

  private updateHistoryState(): void {
    this.canUndo.set(this.editor?.UndoManager.hasUndo() ?? false);
    this.canRedo.set(this.editor?.UndoManager.hasRedo() ?? false);
  }

  private handleHistoryTraversal(): void {
    this.updateHistoryState();
    this.scheduleDocumentChange();

    const selected = this.editor?.getSelected();

    if (selected)
      this.updateSelection(selected);
    else
      this.selection.set(null);
  }

  private isCanvasTextEditing(): boolean {
    const activeElement = this.canvasDocument?.activeElement;

    if (!activeElement)
      return false;

    return Boolean(activeElement.closest('[contenteditable]:not([contenteditable="false"])'))
      || ['input', 'select', 'textarea'].includes(activeElement.tagName.toLowerCase());
  }

  private isHtmlElement(value: unknown): value is HTMLElement {
    return Boolean(value && typeof value === 'object' && 'tagName' in value
      && typeof (value as HTMLElement).closest === 'function');
  }

  private mediaQueryMatches(query: string): boolean {
    return this.getMediaQuery(query)?.matches ?? false;
  }

  private getMediaQuery(query: string): MediaQueryList | null {
    if (typeof window.matchMedia !== 'function')
      return null;

    return window.matchMedia(query);
  }

  private showNotification(message: string): void {
    if (this.notificationTimer)
      clearTimeout(this.notificationTimer);

    this.notification.set(message);
    this.notificationTimer = setTimeout(() => {
      if (this.notification() === message)
        this.notification.set(null);
    }, 2400);
  }

  private getFriendlyElementName(tagName: string): string {
    const labels: Readonly<Record<string, string>> = {
      a: $localize`:@@admin.visualBuilder.element.link:Link`,
      button: $localize`:@@admin.visualBuilder.element.button:Botão`,
      footer: $localize`:@@admin.visualBuilder.element.footer:Rodapé`,
      form: $localize`:@@admin.visualBuilder.element.form:Formulário`,
      header: $localize`:@@admin.visualBuilder.element.header:Cabeçalho`,
      img: $localize`:@@admin.visualBuilder.element.image:Imagem`,
      nav: $localize`:@@admin.visualBuilder.element.navigation:Navegação`,
      p: $localize`:@@admin.visualBuilder.element.text:Texto`,
      section: $localize`:@@admin.visualBuilder.element.section:Seção`,
      video: $localize`:@@admin.visualBuilder.element.video:Vídeo`,
    };

    if (/^h[1-6]$/.test(tagName))
      return $localize`:@@admin.visualBuilder.element.heading:Título`;

    return labels[tagName] ?? $localize`:@@admin.visualBuilder.element.item:Elemento`;
  }

  private styleValue(styles: StyleProps, property: string): string {
    const value = styles[property];

    return typeof value === 'string' ? value : '';
  }

  private numericStyle(styles: StyleProps, property: string, fallback = 0): number {
    const parsedValue = Number.parseFloat(this.styleValue(styles, property));

    return Number.isFinite(parsedValue) ? parsedValue : fallback;
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    })[character] ?? character);
  }

  private escapeCssUrl(value: string): string {
    return value.replace(/[\\'\n\r)]/g, '');
  }
}
