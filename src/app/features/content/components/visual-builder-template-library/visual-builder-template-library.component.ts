import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { VisualBuilderDocument } from '@shared/models/visual-builder-document.model';

import { VisualBuilderTemplate } from '../../models/visual-builder-template.model';

@Component({
  selector: 'app-visual-builder-template-library',
  standalone: false,
  templateUrl: './visual-builder-template-library.component.html',
  styleUrl: './visual-builder-template-library.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisualBuilderTemplateLibraryComponent {
  public readonly templates = input.required<readonly VisualBuilderTemplate[]>();
  public readonly currentDocument = input.required<VisualBuilderDocument>();
  public readonly applyTemplate = output<VisualBuilderTemplate>();
  public readonly saveTemplate = output<string>();

  protected readonly selectedId = signal<string>('studio-home');
  protected readonly category = signal<string>('Todos');
  protected readonly customTemplateName = signal('');
  protected readonly categoryOptions = computed(() => [
    { label: $localize`:@@admin.visualBuilder.template.all:Todos os modelos`, value: 'Todos' },
    ...[...new Set(this.templates().map((template) => template.category))]
      .map((value) => ({ label: value, value })),
  ]);
  protected readonly filteredTemplates = computed(() => {
    const category = this.category();

    return category === 'Todos'
      ? this.templates()
      : this.templates().filter((template) => template.category === category);
  });
  protected readonly selectedTemplate = computed(() =>
    this.templates().find((template) => template.id === this.selectedId()) ?? this.templates()[0],
  );
  protected readonly previewDocument = computed<VisualBuilderDocument>(() => {
    const template = this.selectedTemplate();
    const current = this.currentDocument();

    return {
      ...current,
      projectData: template.projectData ?? {},
      html: template.html ?? `<div class="lc-page">${template.content ?? ''}</div>`,
      css: template.css ?? template.styles ?? '',
    };
  });

  protected handleTemplateName(event: Event): void {
    if (!(event.target instanceof HTMLInputElement))
      return;

    this.customTemplateName.set(event.target.value);
  }

  protected saveCurrent(): void {
    this.saveTemplate.emit(this.customTemplateName());
    this.customTemplateName.set('');
  }
}
