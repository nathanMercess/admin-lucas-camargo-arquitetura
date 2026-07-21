import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
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
  private readonly formBuilder = inject(FormBuilder);
  private isHydrating = false;
  private hydratedBlock: RichTextBlock | null = null;
  public readonly label = input.required<string>();
  public readonly block = input.required<RichTextBlock>();
  public readonly blockChange = output<RichTextBlock>();
  protected readonly richTextForm = this.formBuilder.nonNullable.group({
    lines: this.formBuilder.array([this.createLineForm()]),
  });

  public constructor() {
    this.richTextForm.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.emitChange());

    effect(() => {
      const block = this.block();

      if (block === this.hydratedBlock)
        return;

      this.hydrate(block);
    });
  }

  protected addLine(): void {
    this.richTextForm.controls.lines.push(this.createLineForm());
  }

  protected removeLine(index: number): void {
    if (this.richTextForm.controls.lines.length === 1)
      return;

    this.richTextForm.controls.lines.removeAt(index);
  }

  protected addSegment(lineIndex: number): void {
    this.richTextForm.controls.lines.at(lineIndex).controls.segments.push(this.createSegmentForm());
  }

  protected removeSegment(lineIndex: number, segmentIndex: number): void {
    const segments = this.richTextForm.controls.lines.at(lineIndex).controls.segments;

    if (segments.length === 1)
      return;

    segments.removeAt(segmentIndex);
  }

  private hydrate(block: RichTextBlock): void {
    this.isHydrating = true;
    this.hydratedBlock = block;
    const lines = this.richTextForm.controls.lines;
    lines.clear({ emitEvent: false });
    block.lines.forEach((line) => lines.push(this.createLineForm(line), { emitEvent: false }));

    if (lines.length === 0)
      lines.push(this.createLineForm(), { emitEvent: false });

    this.richTextForm.markAsPristine();
    this.isHydrating = false;
  }

  private emitChange(): void {
    if (this.isHydrating || this.richTextForm.invalid)
      return;

    const value = this.richTextForm.getRawValue();
    const block: RichTextBlock = {
      lines: value.lines.map((line): RichTextLine => ({
        segments: line.segments.map((segment): RichTextSegment => ({
          text: segment.text,
          emphasis: segment.emphasis,
        })),
      })),
    };
    this.hydratedBlock = block;
    this.blockChange.emit(block);
  }

  private createLineForm(line?: RichTextLine) {
    const firstSegment = line?.segments[0];
    const group = this.formBuilder.nonNullable.group({
      segments: this.formBuilder.array([this.createSegmentForm(firstSegment)]),
    });

    if (line && line.segments.length > 1)
      line.segments.slice(1).forEach((segment) => group.controls.segments.push(
        this.createSegmentForm(segment),
        { emitEvent: false },
      ));

    return group;
  }

  private createSegmentForm(segment?: RichTextSegment) {
    return this.formBuilder.nonNullable.group({
      text: [segment?.text ?? '', [Validators.required, Validators.maxLength(240)]],
      emphasis: [segment?.emphasis ?? false],
    });
  }
}
