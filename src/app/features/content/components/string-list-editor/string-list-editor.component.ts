import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-string-list-editor',
  templateUrl: './string-list-editor.component.html',
  styleUrl: './string-list-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class StringListEditorComponent {
  private readonly formBuilder = inject(FormBuilder);
  private isHydrating = false;
  private hydratedItems: readonly string[] | null = null;
  public readonly label = input.required<string>();
  public readonly itemLabel = input<string>($localize`:@@admin.stringList.item:Item`);
  public readonly items = input.required<readonly string[]>();
  public readonly itemsChange = output<readonly string[]>();
  protected readonly listForm = this.formBuilder.nonNullable.group({
    items: this.formBuilder.array([this.createControl()]),
  });

  public constructor() {
    this.listForm.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.emitChange());

    effect(() => {
      const items = this.items();

      if (items === this.hydratedItems)
        return;

      this.isHydrating = true;
      this.hydratedItems = items;
      const controls = this.listForm.controls.items;
      controls.clear({ emitEvent: false });
      items.forEach((item) => controls.push(this.createControl(item), { emitEvent: false }));

      if (controls.length === 0)
        controls.push(this.createControl(), { emitEvent: false });

      this.listForm.markAsPristine();
      this.isHydrating = false;
    });
  }

  protected add(): void {
    this.listForm.controls.items.push(this.createControl());
  }

  protected remove(index: number): void {
    if (this.listForm.controls.items.length === 1)
      return;

    this.listForm.controls.items.removeAt(index);
  }

  private emitChange(): void {
    if (this.isHydrating || this.listForm.invalid)
      return;

    const items = this.listForm.getRawValue().items.map((item) => item.trim()).filter(Boolean);
    this.hydratedItems = items;
    this.itemsChange.emit(items);
  }

  private createControl(value = ''): FormControl<string> {
    return this.formBuilder.nonNullable.control(value, [Validators.required, Validators.maxLength(500)]);
  }
}
