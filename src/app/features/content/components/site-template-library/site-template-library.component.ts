import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { ThemeConfig } from '@shared/models/theme-config.model';

import { SiteTemplatePreset } from '../../models/site-template-preset.model';
import { SiteTemplateCatalogService } from '../../services/site-template-catalog.service';

@Component({
  selector: 'app-site-template-library',
  templateUrl: './site-template-library.component.html',
  styleUrl: './site-template-library.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class SiteTemplateLibraryComponent {
  private readonly catalog = inject(SiteTemplateCatalogService);

  public readonly currentTheme = input.required<ThemeConfig>();
  public readonly themeChange = output<ThemeConfig>();

  protected readonly presets = this.catalog.presets;

  protected isActive(preset: SiteTemplatePreset): boolean {
    const currentTheme = this.currentTheme();
    const presetTheme = preset.theme;

    return (
      currentTheme.presetId === preset.id &&
      this.recordsMatch(currentTheme.colors, presetTheme.colors) &&
      this.recordsMatch(currentTheme.typography, presetTheme.typography) &&
      this.recordsMatch(currentTheme.layout, presetTheme.layout) &&
      this.recordsMatch(currentTheme.motion, presetTheme.motion)
    );
  }

  protected apply(preset: SiteTemplatePreset): void {
    if (this.isActive(preset))
      return;

    this.themeChange.emit(structuredClone(preset.theme));
  }

  protected applyAriaLabel(preset: SiteTemplatePreset): string {
    return $localize`:@@admin.templates.applyAriaLabel:Aplicar o template ${preset.name}:templateName:`;
  }

  private recordsMatch(first: object, second: object): boolean {
    const firstEntries = Object.entries(first);

    return (
      firstEntries.length === Object.keys(second).length &&
      firstEntries.every(([key, value]) => Reflect.get(second, key) === value)
    );
  }
}
