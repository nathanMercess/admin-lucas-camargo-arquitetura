import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { SiteLink } from '@shared/models/site-link.model';

import { safeHrefValidator } from '../../validators/safe-href.validator';

@Component({
  selector: 'app-site-link-editor',
  templateUrl: './site-link-editor.component.html',
  styleUrl: './site-link-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class SiteLinkEditorComponent {
  private readonly formBuilder = inject(FormBuilder);
  private isHydrating = false;
  private hydratedLink: SiteLink | null = null;
  public readonly label = input.required<string>();
  public readonly link = input.required<SiteLink>();
  public readonly linkChange = output<SiteLink>();
  protected readonly targetOptions = [
    { label: $localize`:@@admin.link.sameTab:Mesma aba`, value: '_self' },
    { label: $localize`:@@admin.link.newTab:Nova aba`, value: '_blank' },
  ];
  protected readonly linkForm = this.formBuilder.nonNullable.group({
    id: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    label: ['', [Validators.required, Validators.maxLength(100)]],
    href: ['', [Validators.required, safeHrefValidator]],
    ariaLabel: ['', Validators.maxLength(160)],
    target: this.formBuilder.nonNullable.control<'_self' | '_blank'>('_self'),
  });

  public constructor() {
    this.linkForm.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.emitChange());

    effect(() => {
      const link = this.link();

      if (link === this.hydratedLink)
        return;

      this.isHydrating = true;
      this.hydratedLink = link;
      this.linkForm.setValue({
        id: link.id,
        label: link.label,
        href: link.href,
        ariaLabel: link.ariaLabel ?? '',
        target: link.target ?? '_self',
      });
      this.linkForm.markAsPristine();
      this.isHydrating = false;
    });
  }

  private emitChange(): void {
    if (this.isHydrating || this.linkForm.invalid)
      return;

    const value = this.linkForm.getRawValue();
    const link: SiteLink = {
      id: value.id.trim(),
      label: value.label.trim(),
      href: value.href.trim(),
      ...(value.ariaLabel.trim() ? { ariaLabel: value.ariaLabel.trim() } : {}),
      target: value.target,
    };
    this.hydratedLink = link;
    this.linkChange.emit(link);
  }
}
