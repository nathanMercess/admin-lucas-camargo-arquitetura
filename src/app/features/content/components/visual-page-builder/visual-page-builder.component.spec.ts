import { TestBed } from '@angular/core/testing';
import type { Component as GrapesComponent, Editor } from 'grapesjs';
import { ConfirmationService } from 'primeng/api';
import { vi } from 'vitest';

import { ContentModule } from '../../content.module';
import { VisualBuilderBlockDrag } from '../../models/visual-builder-block-drag.model';
import { VisualBuilderBlock } from '../../models/visual-builder-block.model';
import { VisualBuilderCatalogService } from '../../services/visual-builder-catalog.service';
import { VisualPageBuilderComponent } from './visual-page-builder.component';

interface DragTestAccess {
  editor: Editor | null;
  draggedBlock: VisualBuilderBlock | null;
  dropPreview: GrapesComponent | null;
  canvasDocument: Document | null;
  canUndo: () => boolean;
  startBlockDrag(payload: VisualBuilderBlockDrag): void;
  endBlockDrag(): void;
  moveDropPreview(event: DragEvent): void;
  completeBlockDrag(component: GrapesComponent | null): void;
  requestRemoveSelected(): void;
  isCanvasTextEditing(): boolean;
  setMotionSpeed(value: number): void;
  showCanvasMotionStart(): void;
  showCanvasMotionEnd(): void;
  restartCanvasMotion(): void;
  toggleMotionPlayback(): void;
}

class FakeGrapesComponent {
  public readonly children: FakeGrapesComponent[] = [];
  public parentComponent: FakeGrapesComponent | null = null;
  public element: HTMLElement | null = null;
  public name = '';
  private readonly attributes: Record<string, string> = {};
  private styles: Readonly<Record<string, string>> = {};

  public constructor(
    public readonly id: string,
    public readonly tagName = 'section',
  ) {}

  public append(): GrapesComponent[] {
    const component = new FakeGrapesComponent(`preview-${this.children.length}`);

    this.insert(component, this.children.length);

    return [component as unknown as GrapesComponent];
  }

  public insert(component: FakeGrapesComponent, at: number): void {
    component.parentComponent?.removeChild(component);
    component.parentComponent = this;
    this.children.splice(Math.max(0, Math.min(at, this.children.length)), 0, component);
  }

  public parent(): GrapesComponent | null {
    return this.parentComponent as unknown as GrapesComponent | null;
  }

  public index(): number {
    return this.parentComponent?.children.indexOf(this) ?? -1;
  }

  public move(destination: GrapesComponent, options: { readonly at: number }): void {
    (destination as unknown as FakeGrapesComponent).insert(this, options.at);
  }

  public remove(): void {
    this.parentComponent?.removeChild(this);
  }

  public components(): GrapesComponent['components'] extends (...args: never[]) => infer Result
    ? Result
    : never {
    return {
      models: this.children,
      length: this.children.length,
      forEach: (callback: (component: FakeGrapesComponent) => void) => this.children.forEach(callback),
    } as never;
  }

  public addAttributes(attributes: Readonly<Record<string, string>>): void {
    Object.assign(this.attributes, attributes);
  }

  public getAttributes(): Readonly<Record<string, string>> {
    return this.attributes;
  }

  public setStyle(styles: Readonly<Record<string, string>>): void {
    this.styles = styles;
  }

  public getStyle(): Readonly<Record<string, string>> {
    return this.styles;
  }

  public get(property: string): string {
    return property === 'tagName' ? this.tagName : '';
  }

  public setName(name: string): void {
    this.name = name;
  }

  public getEl(): HTMLElement | null {
    return this.element;
  }

  private removeChild(component: FakeGrapesComponent): void {
    const index = this.children.indexOf(component);

    if (index >= 0)
      this.children.splice(index, 1);

    component.parentComponent = null;
  }
}

describe('VisualPageBuilderComponent drag and drop', () => {
  let component: VisualPageBuilderComponent;
  let access: DragTestAccess;
  let block: VisualBuilderBlock;
  let wrapper: FakeGrapesComponent;
  let first: FakeGrapesComponent;
  let second: FakeGrapesComponent;
  let editor: Editor;
  let startDrag: ReturnType<typeof vi.fn>;
  let endDrag: ReturnType<typeof vi.fn>;
  let select: ReturnType<typeof vi.fn>;
  let skip: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ContentModule] }).compileComponents();
    component = TestBed.runInInjectionContext(() => new VisualPageBuilderComponent());
    access = component as unknown as DragTestAccess;
    block = TestBed.inject(VisualBuilderCatalogService).blocks[0];
    wrapper = new FakeGrapesComponent('wrapper');
    first = new FakeGrapesComponent('first');
    second = new FakeGrapesComponent('second');
    wrapper.insert(first, 0);
    wrapper.insert(second, 1);
    startDrag = vi.fn();
    endDrag = vi.fn();
    select = vi.fn();
    skip = vi.fn((callback: () => void) => callback());
    editor = {
      Blocks: {
        get: vi.fn(() => ({ id: block.id })),
        startDrag,
        endDrag,
      },
      Components: {
        getById: vi.fn((id: string) => [first, second].find((item) => item.id === id)),
      },
      UndoManager: {
        skip,
        hasUndo: vi.fn(() => true),
        hasRedo: vi.fn(() => false),
      },
      getWrapper: vi.fn(() => wrapper),
      getSelected: vi.fn(() => null),
      getHtml: vi.fn(() => '<section data-builder-label="Teste"></section>'),
      getCss: vi.fn(() => ''),
      getProjectData: vi.fn(() => ({})),
      select,
    } as unknown as Editor;
    access.editor = editor;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('moves a real-size preview and reflows its sibling components', () => {
    const source = document.createElement('article');
    const target = document.createElement('section');
    const preventDefault = vi.fn();

    target.id = second.id;
    second.element = target;
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      top: 200,
      height: 100,
    } as DOMRect);

    access.startBlockDrag(createDragPayload(block, source));
    access.moveDropPreview({
      target,
      clientY: 220,
      preventDefault,
    } as unknown as DragEvent);

    expect(startDrag).toHaveBeenCalledOnce();
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(wrapper.children.map((item) => item.id)).toEqual([
      first.id,
      access.dropPreview && (access.dropPreview as unknown as FakeGrapesComponent).id,
      second.id,
    ]);
    expect(skip).toHaveBeenCalled();
    expect(source.getAttribute('aria-grabbed')).toBe('true');
    expect(access.dropPreview?.getAttributes()['data-lc-drop-label']).toContain('Antes de');
  });

  it('commits one component at the preview position and emits one document change', () => {
    const source = document.createElement('article');
    const emittedDocuments: unknown[] = [];
    const dropped = new FakeGrapesComponent('dropped');

    component.documentChange.subscribe((document) => emittedDocuments.push(document));
    access.startBlockDrag(createDragPayload(block, source));
    access.dropPreview?.move(wrapper as unknown as GrapesComponent, { at: 1 });
    wrapper.insert(dropped, wrapper.children.length);
    endDrag.mockImplementation(() => access.completeBlockDrag(dropped as unknown as GrapesComponent));

    access.endBlockDrag();
    access.endBlockDrag();
    access.completeBlockDrag(dropped as unknown as GrapesComponent);

    expect(wrapper.children.map((item) => item.id)).toEqual([first.id, dropped.id, second.id]);
    expect(select).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenCalledWith(dropped);
    expect(endDrag).toHaveBeenCalledTimes(1);
    expect(emittedDocuments).toHaveLength(1);
    expect(access.canUndo()).toBe(true);
    expect(source.hasAttribute('aria-grabbed')).toBe(false);
    expect(access.draggedBlock).toBeNull();
    expect(access.dropPreview).toBeNull();
  });

  it('restores the original structure when the drag ends outside the canvas', () => {
    vi.useFakeTimers();
    const source = document.createElement('article');
    const emittedDocuments: unknown[] = [];

    component.documentChange.subscribe((document) => emittedDocuments.push(document));
    access.startBlockDrag(createDragPayload(block, source));
    access.endBlockDrag();
    vi.runAllTimers();

    expect(wrapper.children).toEqual([first, second]);
    expect(emittedDocuments).toHaveLength(0);
    expect(select).not.toHaveBeenCalled();
    expect(source.hasAttribute('aria-grabbed')).toBe(false);
    expect(access.draggedBlock).toBeNull();
    expect(access.dropPreview).toBeNull();
  });

  it('rejects a section dropped inside text without mutating the document', () => {
    const source = document.createElement('article');
    const target = document.createElement('p');
    const textTarget = new FakeGrapesComponent('text-target', 'p');
    const dropped = new FakeGrapesComponent('rejected-section');
    const emittedDocuments: unknown[] = [];

    target.id = textTarget.id;
    wrapper.insert(textTarget, 1);
    vi.mocked(editor.Components.getById).mockImplementation((id: string) =>
      (id === textTarget.id ? textTarget : first) as unknown as GrapesComponent,
    );
    component.documentChange.subscribe((document) => emittedDocuments.push(document));
    access.startBlockDrag(createDragPayload(block, source));
    access.moveDropPreview({ target, clientY: 100, preventDefault: vi.fn() } as unknown as DragEvent);
    wrapper.insert(dropped, wrapper.children.length);
    access.completeBlockDrag(dropped as unknown as GrapesComponent);

    expect(access.dropPreview).toBeNull();
    expect(wrapper.children).toEqual([first, textTarget, second]);
    expect(emittedDocuments).toHaveLength(0);
    expect(select).not.toHaveBeenCalled();
    expect(source.hasAttribute('aria-grabbed')).toBe(false);
  });

  it('controls the canvas animation timeline without changing the document', () => {
    const animation = {
      currentTime: 220,
      playbackRate: 1,
      pause: vi.fn(),
      play: vi.fn(),
      effect: { getComputedTiming: vi.fn(() => ({ endTime: 900 })) },
    } as unknown as Animation;
    const canvasDocument = document.implementation.createHTMLDocument('Canvas');
    const getAnimations = vi.fn(() => [animation]);

    Object.assign(canvasDocument, { getAnimations });
    access.canvasDocument = canvasDocument;

    access.setMotionSpeed(1.5);
    access.showCanvasMotionStart();

    expect(animation.playbackRate).toBe(1.5);
    expect(animation.currentTime).toBe(0);
    expect(animation.pause).toHaveBeenCalled();
    expect(canvasDocument.documentElement.dataset['lcEditorMotionState']).toBe('paused');

    access.showCanvasMotionEnd();

    expect(animation.currentTime).toBe(900);

    access.restartCanvasMotion();

    expect(animation.currentTime).toBe(0);
    expect(animation.play).toHaveBeenCalled();
    expect(canvasDocument.documentElement.dataset['lcEditorMotionState']).toBe('playing');

    access.toggleMotionPlayback();

    expect(canvasDocument.documentElement.dataset['lcEditorMotionState']).toBe('paused');
  });

  it('asks for confirmation before removing a selected element', () => {
    const confirmationService = TestBed.inject(ConfirmationService);
    const confirmSpy = vi.spyOn(confirmationService, 'confirm');

    vi.mocked(editor.getSelected).mockReturnValue(second as unknown as GrapesComponent);
    access.requestRemoveSelected();

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(wrapper.children).toContain(second);
    expect(confirmSpy.mock.calls[0]?.[0]?.acceptLabel).toBe('Excluir elemento');

    confirmSpy.mock.calls[0]?.[0]?.accept?.();

    expect(wrapper.children).not.toContain(second);
  });

  it('recognizes direct text editing in the canvas before handling destructive shortcuts', () => {
    access.canvasDocument = {
      activeElement: {
        tagName: 'TEXTAREA',
        closest: vi.fn(() => null),
      },
    } as unknown as Document;

    expect(access.isCanvasTextEditing()).toBe(true);
  });
});

function createDragPayload(
  block: VisualBuilderBlock,
  source: HTMLElement,
): VisualBuilderBlockDrag {
  const dataTransfer = {
    effectAllowed: 'none',
    setData: vi.fn(),
  } as unknown as DataTransfer;

  return {
    block,
    event: {
      currentTarget: source,
      dataTransfer,
    } as unknown as DragEvent,
  };
}
