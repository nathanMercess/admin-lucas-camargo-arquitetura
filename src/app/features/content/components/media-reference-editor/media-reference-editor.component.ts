import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MediaAsset } from '@shared/models/media-asset.model';
import { MediaReference } from '@shared/models/media-reference.model';

@Component({
  selector: 'app-media-reference-editor',
  templateUrl: './media-reference-editor.component.html',
  styleUrl: './media-reference-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class MediaReferenceEditorComponent {
  private readonly formBuilder = inject(FormBuilder);
  private isHydrating = false;
  private hydratedReference: MediaReference | null = null;
  public readonly label = input.required<string>();
  public readonly reference = input.required<MediaReference>();
  public readonly assets = input.required<readonly MediaAsset[]>();
  public readonly referenceChange = output<MediaReference>();
  protected readonly assetOptions = computed(() => [...this.assets()]);
  protected readonly referenceForm = this.formBuilder.nonNullable.group({
    assetId: ['', Validators.required],
    alt: ['', Validators.maxLength(240)],
    decorative: [false],
    focalPointX: [50, [Validators.min(0), Validators.max(100)]],
    focalPointY: [50, [Validators.min(0), Validators.max(100)]],
    caption: ['', Validators.maxLength(240)],
  });

  public constructor() {
    this.referenceForm.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.emitChange());

    effect(() => {
      const reference = this.reference();

      if (reference === this.hydratedReference)
        return;

      this.isHydrating = true;
      this.hydratedReference = reference;
      this.referenceForm.setValue({
        assetId: reference.assetId,
        alt: reference.alt,
        decorative: reference.decorative,
        focalPointX: reference.focalPointX,
        focalPointY: reference.focalPointY,
        caption: reference.caption ?? '',
      });
      this.referenceForm.markAsPristine();
      this.isHydrating = false;
    });
  }

  private emitChange(): void {
    if (this.isHydrating || this.referenceForm.invalid)
      return;

    const value = this.referenceForm.getRawValue();
    const reference: MediaReference = {
      assetId: value.assetId,
      alt: value.decorative ? '' : value.alt.trim(),
      decorative: value.decorative,
      focalPointX: value.focalPointX,
      focalPointY: value.focalPointY,
      ...(value.caption.trim() ? { caption: value.caption.trim() } : {}),
    };
    this.hydratedReference = reference;
    this.referenceChange.emit(reference);
  }
}
