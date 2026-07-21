import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { SiteTemplateId } from '@shared/models/site-template-id.type';
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
  public readonly customize = output<ThemeConfig>();

  protected readonly presets = this.catalog.presets;
  protected readonly selectedPresetId = signal<SiteTemplateId | null>(null);
  protected readonly selectedPreset = computed(() => {
    const selectedId = this.selectedPresetId() ?? this.currentTheme().presetId;

    return this.presets.find((preset) => preset.id === selectedId) ?? this.presets[0];
  });

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

  protected isSelected(preset: SiteTemplatePreset): boolean {
    return this.selectedPreset().id === preset.id;
  }

  protected select(preset: SiteTemplatePreset): void {
    this.selectedPresetId.set(preset.id);
  }

  protected apply(preset: SiteTemplatePreset): void {
    if (this.isActive(preset))
      return;

    this.themeChange.emit(structuredClone(preset.theme));
  }

  protected customizeSelected(): void {
    this.customize.emit(structuredClone(this.selectedPreset().theme));
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
