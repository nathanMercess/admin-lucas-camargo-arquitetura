import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MediaReference } from '@shared/models/media-reference.model';
import { RichTextBlock } from '@shared/models/rich-text-block.model';
import { SiteConfigV2 } from '@shared/models/site-config-v2.model';
import { SitePageV2 } from '@shared/models/site-page-v2.model';

@Component({
  selector: 'app-site-v2-preview',
  templateUrl: './site-v2-preview.component.html',
  styleUrl: './site-v2-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class SiteV2PreviewComponent {
  public readonly document = input.required<SiteConfigV2>();
  public readonly page = input.required<SitePageV2>();
  public readonly device = input<'desktop' | 'mobile'>('desktop');

  protected readonly sections = computed(() => [...this.page().sections]
    .filter((section) => section.visible)
    .sort((first, second) => first.order - second.order));

  protected richText(block: RichTextBlock): string {
    return block.lines
      .map((line) => line.segments.map((segment) => segment.text).join(''))
      .join(' ');
  }

  protected mediaPath(reference: MediaReference): string {
    return this.document().media.find((asset) => asset.id === reference.assetId)?.path ?? '';
  }

  protected selectedProjects(projectIds: readonly string[]) {
    const ids = new Set(projectIds);

    return [...this.document().projects]
      .filter((project) => ids.has(project.id) && project.visible)
      .sort((first, second) => first.order - second.order);
  }

  protected projectCoverPath(projectId: string): string {
    const project = this.document().projects.find((current) => current.id === projectId);

    return project ? this.mediaPath(project.cover) : '';
  }
}
