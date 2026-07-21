import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import { RichTextBlock } from '@shared/models/rich-text-block.model';
import { RichTextLine } from '@shared/models/rich-text-line.model';
import { RichTextSegment } from '@shared/models/rich-text-segment.model';

@Component({
  selector: 'app-rich-text-block-editor',
  templateUrl: './rich-text-block-editor.component.html',
  styleUrl: './rich-text-block-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class RichTextBlockEditorComponent {
  private readonly editor = viewChild<ElementRef<HTMLDivElement>>('editor');
  private hydratedBlock: RichTextBlock | null = null;

  public readonly label = input.required<string>();
  public readonly block = input.required<RichTextBlock>();
  public readonly blockChange = output<RichTextBlock>();

  public constructor() {
    effect(() => {
      const block = this.block();
      const editor = this.editor()?.nativeElement;

      if (!editor || block === this.hydratedBlock)
        return;

      this.hydratedBlock = block;
      this.render(block, editor);
    });
  }

  protected toggleEmphasis(): void {
    const editor = this.editor()?.nativeElement;
    const selection = editor?.ownerDocument.getSelection();

    if (!editor || !selection?.anchorNode || !editor.contains(selection.anchorNode))
      return;

    editor.ownerDocument.execCommand('bold');
    this.emitEditorValue(editor);
  }

  protected handleInput(event: Event): void {
    this.emitEditorValue(event.currentTarget as HTMLDivElement);
  }

  private emitEditorValue(editor: HTMLDivElement): void {
    const block = this.parse(editor);

    if (block.lines.length === 0)
      return;

    this.hydratedBlock = block;
    this.blockChange.emit(block);
  }

  private render(block: RichTextBlock, editor: HTMLDivElement): void {
    const document = editor.ownerDocument;
    const fragment = document.createDocumentFragment();

    for (const line of block.lines) {
      const lineElement = document.createElement('div');

      for (const segment of line.segments) {
        const segmentElement = document.createElement(segment.emphasis ? 'strong' : 'span');
        segmentElement.textContent = segment.text;
        lineElement.append(segmentElement);
      }

      fragment.append(lineElement);
    }

    editor.replaceChildren(fragment);
  }

  private parse(editor: HTMLDivElement): RichTextBlock {
    const lines: RichTextLine[] = [];
    let segments: RichTextSegment[] = [];

    const append = (text: string, emphasis: boolean): void => {
      if (!text)
        return;

      const previous = segments.at(-1);

      if (previous?.emphasis === emphasis) {
        segments[segments.length - 1] = { ...previous, text: previous.text + text };
        return;
      }

      segments.push({ text, emphasis });
    };
    const flush = (): void => {
      const normalized = segments.flatMap((segment) => this.splitSegment(segment));

      if (normalized.some((segment) => segment.text.length > 0))
        lines.push({ segments: normalized });

      segments = [];
    };
    const visit = (node: Node, emphasis = false): void => {
      if (node.nodeType === Node.TEXT_NODE) {
        const parts = (node.textContent ?? '').split('\n');
        parts.forEach((part, index) => {
          append(part, emphasis);

          if (index < parts.length - 1)
            flush();
        });
        return;
      }

      if (!(node instanceof HTMLElement))
        return;

      if (node.tagName === 'BR') {
        flush();
        return;
      }

      const isBlock = node.tagName === 'DIV' || node.tagName === 'P';
      const nextEmphasis = emphasis || node.tagName === 'B' || node.tagName === 'STRONG';

      if (isBlock && segments.length > 0)
        flush();

      node.childNodes.forEach((child) => visit(child, nextEmphasis));

      if (isBlock)
        flush();
    };

    editor.childNodes.forEach((node) => visit(node));
    flush();

    return { lines };
  }

  private splitSegment(segment: RichTextSegment): RichTextSegment[] {
    const chunks: RichTextSegment[] = [];

    for (let index = 0; index < segment.text.length; index += 240)
      chunks.push({ text: segment.text.slice(index, index + 240), emphasis: segment.emphasis });

    return chunks;
  }
}
