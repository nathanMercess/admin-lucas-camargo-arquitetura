import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ContactChannel } from '@shared/models/contact-channel.model';
import { MediaAsset } from '@shared/models/media-asset.model';
import { MediaReference } from '@shared/models/media-reference.model';
import { Metric } from '@shared/models/metric.model';
import { PracticeArea } from '@shared/models/practice-area.model';
import { ProcessStep } from '@shared/models/process-step.model';
import { RichTextBlock } from '@shared/models/rich-text-block.model';
import { SiteConfigV1 } from '@shared/models/site-config-v1.model';
import { SiteLink } from '@shared/models/site-link.model';
import { SiteSection } from '@shared/models/site-section.model';
import { ConfirmationService } from 'primeng/api';

import { FormArrayEditorService } from '../../services/form-array-editor.service';
import { SiteSectionRegistryService } from '../../services/site-section-registry.service';
import { safeOptionalHrefValidator } from '../../validators/safe-href.validator';

type SectionCollection = 'practiceAreas' | 'metrics' | 'steps' | 'channels';

@Component({
  selector: 'app-section-content-editor',
  templateUrl: './section-content-editor.component.html',
  styleUrl: './section-content-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class SectionContentEditorComponent {
  private readonly arrayEditor = inject(FormArrayEditorService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly sectionRegistry = inject(SiteSectionRegistryService);
  private isHydrating = false;
  private hydratedSection: SiteSection | null = null;
  public readonly section = input.required<SiteSection>();
  public readonly config = input.required<SiteConfigV1>();
  public readonly expanded = input(false);
  public readonly sectionChange = output<SiteSection>();
  public readonly assetUploaded = output<MediaAsset>();
  protected readonly categoryOptions = computed(() => [...this.config().portfolioCategories]);
  protected readonly rotationIntervalOptions = [
    { label: $localize`:@@admin.section.rotation.fiveSeconds:A cada 5 segundos`, value: 5000 },
    { label: $localize`:@@admin.section.rotation.sevenSeconds:A cada 7 segundos`, value: 7000 },
    { label: $localize`:@@admin.section.rotation.tenSeconds:A cada 10 segundos`, value: 10000 },
    { label: $localize`:@@admin.section.rotation.fifteenSeconds:A cada 15 segundos`, value: 15000 },
    { label: $localize`:@@admin.section.rotation.thirtySeconds:A cada 30 segundos`, value: 30000 },
  ];
  protected readonly sectionForm = this.formBuilder.nonNullable.group({
    anchor: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    overline: ['', Validators.maxLength(160)],
    indexLabel: ['', Validators.maxLength(20)],
    caption: ['', Validators.maxLength(240)],
    ariaLabel: ['', Validators.maxLength(200)],
    plainTitle: ['', Validators.maxLength(200)],
    portraitAriaLabel: ['', Validators.maxLength(200)],
    profileName: ['', Validators.maxLength(120)],
    profileTitle: ['', Validators.maxLength(160)],
    profileBiography: ['', Validators.maxLength(1200)],
    autoRotationEnabled: [false],
    autoRotationIntervalMs: [5000, [Validators.min(3000), Validators.max(30000)]],
    categoryIds: this.formBuilder.nonNullable.control<string[]>([]),
    practiceAreas: this.formBuilder.array([this.createPracticeAreaForm()]),
    metrics: this.formBuilder.array([this.createMetricForm()]),
    steps: this.formBuilder.array([this.createStepForm()]),
    channels: this.formBuilder.array([this.createChannelForm()]),
  });

  public constructor() {
    this.sectionForm.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.emitFormChange());

    effect(() => {
      const section = this.section();

      if (section === this.hydratedSection)
        return;

      this.hydrate(section);
    });
  }

  protected sectionLabel(section: SiteSection): string {
    return this.sectionRegistry.label(section.type);
  }

  protected updateTitle(title: RichTextBlock): void {
    const section = this.section();

    switch (section.type) {
      case 'hero':
      case 'manifesto':
      case 'practice':
      case 'portfolio':
      case 'about':
      case 'contact':
        this.emit({ ...section, title });
        return;
      default:
        return;
    }
  }

  protected updateVisibility(visible: boolean): void {
    this.emit({ ...this.section(), visible });
  }

  protected updateSupportingText(supportingText: RichTextBlock): void {
    const section = this.section();

    if (section.type !== 'hero')
      return;

    this.emit({ ...section, supportingText });
  }

  protected updateLink(link: SiteLink): void {
    const section = this.section();

    switch (section.type) {
      case 'hero':
        this.emit({ ...section, portfolioLink: link });
        return;
      case 'manifesto':
      case 'about':
        this.emit({ ...section, link });
        return;
      case 'contact':
        this.emit({ ...section, cta: link });
        return;
      default:
        return;
    }
  }

  protected updateMedia(reference: MediaReference): void {
    const section = this.section();

    if (section.type === 'hero') {
      this.emit({ ...section, background: reference });
      return;
    }

    if (section.type === 'about')
      this.emit({ ...section, portrait: reference });
  }

  protected updateStringList(items: readonly string[]): void {
    const section = this.section();

    if (section.type === 'manifesto') {
      this.emit({ ...section, body: items });
      return;
    }

    if (section.type === 'portfolio')
      this.emit({ ...section, description: items });
  }

  protected addPracticeArea(): void {
    this.sectionForm.controls.practiceAreas.push(this.createPracticeAreaForm());
  }

  protected removePracticeArea(index: number): void {
    this.requestCollectionRemoval('practiceAreas', index, $localize`:@@admin.section.areaItem:área de atuação`);
  }

  protected addMetric(): void {
    this.sectionForm.controls.metrics.push(this.createMetricForm());
  }

  protected removeMetric(index: number): void {
    this.requestCollectionRemoval('metrics', index, $localize`:@@admin.section.metricItem:indicador`);
  }

  protected addStep(): void {
    this.sectionForm.controls.steps.push(this.createStepForm());
  }

  protected removeStep(index: number): void {
    this.requestCollectionRemoval('steps', index, $localize`:@@admin.section.stepItem:etapa`);
  }

  protected addChannel(): void {
    this.sectionForm.controls.channels.push(this.createChannelForm());
  }

  protected removeChannel(index: number): void {
    this.requestCollectionRemoval('channels', index, $localize`:@@admin.section.channelItem:canal de contato`);
  }

  protected moveCollectionItem(collection: SectionCollection, index: number, offset: -1 | 1): void {
    switch (collection) {
      case 'practiceAreas':
        this.arrayEditor.move(this.sectionForm.controls.practiceAreas, index, offset);
        return;
      case 'metrics':
        this.arrayEditor.move(this.sectionForm.controls.metrics, index, offset);
        return;
      case 'steps':
        this.arrayEditor.move(this.sectionForm.controls.steps, index, offset);
        return;
      case 'channels':
        this.arrayEditor.move(this.sectionForm.controls.channels, index, offset);
        return;
    }
  }

  protected duplicateCollectionItem(collection: SectionCollection, index: number): void {
    switch (collection) {
      case 'practiceAreas': {
        const item = this.sectionForm.controls.practiceAreas.at(index)?.getRawValue();
        if (item)
          this.sectionForm.controls.practiceAreas.insert(index + 1, this.createPracticeAreaForm({ ...item, id: this.copyId(item.id) }));
        return;
      }
      case 'metrics': {
        const item = this.sectionForm.controls.metrics.at(index)?.getRawValue();
        if (item)
          this.sectionForm.controls.metrics.insert(index + 1, this.createMetricForm({ ...item, id: this.copyId(item.id) }));
        return;
      }
      case 'steps': {
        const item = this.sectionForm.controls.steps.at(index)?.getRawValue();
        if (item)
          this.sectionForm.controls.steps.insert(index + 1, this.createStepForm({ ...item, id: this.copyId(item.id) }));
        return;
      }
      case 'channels': {
        const item = this.sectionForm.controls.channels.at(index)?.getRawValue();
        if (item)
          this.sectionForm.controls.channels.insert(index + 1, this.createChannelForm({ ...item, id: this.copyId(item.id) }));
        return;
      }
    }
  }

  private hydrate(section: SiteSection): void {
    this.isHydrating = true;
    this.hydratedSection = section;
    this.sectionForm.reset({
      anchor: section.anchor,
      overline: 'overline' in section ? section.overline : '',
      indexLabel: 'indexLabel' in section ? section.indexLabel : '',
      caption: section.type === 'hero' ? section.caption : '',
      ariaLabel: section.type === 'metrics' ? section.ariaLabel : '',
      plainTitle: section.type === 'process' ? section.title : '',
      portraitAriaLabel: section.type === 'about' ? section.portraitAriaLabel : '',
      profileName: section.type === 'about' ? section.profile.name : '',
      profileTitle: section.type === 'about' ? section.profile.professionalTitle : '',
      profileBiography: section.type === 'about' ? section.profile.biography : '',
      autoRotationEnabled: section.type === 'portfolio' ? section.autoRotationEnabled : false,
      autoRotationIntervalMs: section.type === 'portfolio' ? section.autoRotationIntervalMs : 5000,
      categoryIds: section.type === 'portfolio' ? [...section.categoryIds] : [],
    }, { emitEvent: false });
    this.replacePracticeAreas(section.type === 'practice' ? section.practiceAreas : []);
    this.replaceMetrics(section.type === 'metrics' ? section.metrics : []);
    this.replaceSteps(section.type === 'process' ? section.steps : []);
    this.replaceChannels(section.type === 'contact' ? section.contactChannels : []);
    this.sectionForm.markAsPristine();
    this.isHydrating = false;
  }

  private emitFormChange(): void {
    if (this.isHydrating || this.sectionForm.invalid)
      return;

    const section = this.section();
    const value = this.sectionForm.getRawValue();

    switch (section.type) {
      case 'hero':
        this.emit({
          ...section,
          anchor: value.anchor,
          overline: value.overline,
          indexLabel: value.indexLabel,
          caption: value.caption,
        });
        return;
      case 'manifesto':
        this.emit({ ...section, anchor: value.anchor, indexLabel: value.indexLabel });
        return;
      case 'practice':
        this.emit({
          ...section,
          anchor: value.anchor,
          overline: value.overline,
          indexLabel: value.indexLabel,
          practiceAreas: value.practiceAreas.map((area): PracticeArea => ({ ...area })),
        });
        return;
      case 'portfolio':
        this.emit({
          ...section,
          anchor: value.anchor,
          overline: value.overline,
          categoryIds: value.categoryIds,
          autoRotationEnabled: value.autoRotationEnabled,
          autoRotationIntervalMs: value.autoRotationIntervalMs,
        });
        return;
      case 'metrics':
        this.emit({
          ...section,
          anchor: value.anchor,
          indexLabel: value.indexLabel,
          ariaLabel: value.ariaLabel,
          metrics: value.metrics.map((metric): Metric => ({ ...metric })),
        });
        return;
      case 'about':
        this.emit({
          ...section,
          anchor: value.anchor,
          portraitAriaLabel: value.portraitAriaLabel,
          profile: {
            name: value.profileName,
            professionalTitle: value.profileTitle,
            biography: value.profileBiography,
          },
        });
        return;
      case 'process':
        this.emit({
          ...section,
          anchor: value.anchor,
          overline: value.overline,
          title: value.plainTitle,
          steps: value.steps.map((step): ProcessStep => ({ ...step })),
        });
        return;
      case 'contact':
        this.emit({
          ...section,
          anchor: value.anchor,
          overline: value.overline,
          contactChannels: value.channels.map((channel): ContactChannel => ({
            id: channel.id,
            label: channel.label,
            value: channel.value,
            ...(channel.href.trim() ? { href: channel.href.trim() } : {}),
          })),
        });
        return;
    }
  }

  private emit(section: SiteSection): void {
    this.hydratedSection = section;
    this.sectionChange.emit(section);
  }

  private requestCollectionRemoval(collection: SectionCollection, index: number, label: string): void {
    this.confirmationService.confirm({
      header: $localize`:@@admin.section.removeItemTitle:Excluir ${label}:itemLabel:?`,
      message: $localize`:@@admin.section.removeItemMessage:O item será removido desta seção do rascunho.`,
      acceptLabel: $localize`:@@admin.section.removeItemAccept:Excluir item`,
      rejectLabel: $localize`:@@admin.section.removeItemReject:Cancelar`,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        switch (collection) {
          case 'practiceAreas':
            this.arrayEditor.remove(this.sectionForm.controls.practiceAreas, index);
            return;
          case 'metrics':
            this.arrayEditor.remove(this.sectionForm.controls.metrics, index);
            return;
          case 'steps':
            this.arrayEditor.remove(this.sectionForm.controls.steps, index);
            return;
          case 'channels':
            this.arrayEditor.remove(this.sectionForm.controls.channels, index);
            return;
        }
      },
    });
  }

  private copyId(id: string): string {
    const base = id.trim().replace(/-copy-[a-f0-9]{6}$/i, '') || 'item';
    return `${base}-copy-${crypto.randomUUID().slice(0, 6)}`;
  }

  private replacePracticeAreas(items: readonly PracticeArea[]): void {
    const controls = this.sectionForm.controls.practiceAreas;
    controls.clear({ emitEvent: false });
    items.forEach((item) => controls.push(this.createPracticeAreaForm(item), { emitEvent: false }));
  }

  private replaceMetrics(items: readonly Metric[]): void {
    const controls = this.sectionForm.controls.metrics;
    controls.clear({ emitEvent: false });
    items.forEach((item) => controls.push(this.createMetricForm(item), { emitEvent: false }));
  }

  private replaceSteps(items: readonly ProcessStep[]): void {
    const controls = this.sectionForm.controls.steps;
    controls.clear({ emitEvent: false });
    items.forEach((item) => controls.push(this.createStepForm(item), { emitEvent: false }));
  }

  private replaceChannels(items: readonly ContactChannel[]): void {
    const controls = this.sectionForm.controls.channels;
    controls.clear({ emitEvent: false });
    items.forEach((item) => controls.push(this.createChannelForm(item), { emitEvent: false }));
  }

  private createPracticeAreaForm(item?: PracticeArea) {
    return this.formBuilder.nonNullable.group({
      id: [item?.id ?? '', Validators.required],
      index: [item?.index ?? '', Validators.required],
      title: [item?.title ?? '', Validators.required],
      description: [item?.description ?? '', Validators.required],
    });
  }

  private createMetricForm(item?: Metric) {
    return this.formBuilder.nonNullable.group({
      id: [item?.id ?? '', Validators.required],
      value: [item?.value ?? '', Validators.required],
      label: [item?.label ?? '', Validators.required],
    });
  }

  private createStepForm(item?: ProcessStep) {
    return this.formBuilder.nonNullable.group({
      id: [item?.id ?? '', Validators.required],
      index: [item?.index ?? '', Validators.required],
      title: [item?.title ?? '', Validators.required],
      description: [item?.description ?? '', Validators.required],
    });
  }

  private createChannelForm(item?: ContactChannel) {
    return this.formBuilder.nonNullable.group({
      id: [item?.id ?? '', Validators.required],
      label: [item?.label ?? '', Validators.required],
      value: [item?.value ?? '', Validators.required],
      href: [item?.href ?? '', safeOptionalHrefValidator],
    });
  }
}
