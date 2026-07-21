import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ContactChannel } from '@shared/models/contact-channel.model';
import { MediaReference } from '@shared/models/media-reference.model';
import { Metric } from '@shared/models/metric.model';
import { PracticeArea } from '@shared/models/practice-area.model';
import { ProcessStep } from '@shared/models/process-step.model';
import { RichTextBlock } from '@shared/models/rich-text-block.model';
import { SiteConfigV1 } from '@shared/models/site-config-v1.model';
import { SiteLink } from '@shared/models/site-link.model';
import { SiteSection } from '@shared/models/site-section.model';

import { safeOptionalHrefValidator } from '../../validators/safe-href.validator';

@Component({
  selector: 'app-section-content-editor',
  templateUrl: './section-content-editor.component.html',
  styleUrl: './section-content-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class SectionContentEditorComponent {
  private readonly formBuilder = inject(FormBuilder);
  private isHydrating = false;
  private hydratedSection: SiteSection | null = null;
  public readonly section = input.required<SiteSection>();
  public readonly config = input.required<SiteConfigV1>();
  public readonly sectionChange = output<SiteSection>();
  protected readonly categoryOptions = computed(() => [...this.config().portfolioCategories]);
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
    const labels: Record<SiteSection['type'], string> = {
      hero: $localize`:@@admin.section.hero:Abertura`,
      manifesto: $localize`:@@admin.section.manifesto:Manifesto`,
      practice: $localize`:@@admin.section.practice:Atuação`,
      portfolio: $localize`:@@admin.section.portfolio:Portfólio`,
      metrics: $localize`:@@admin.section.metrics:Indicadores`,
      about: $localize`:@@admin.section.about:Sobre`,
      process: $localize`:@@admin.section.process:Processo`,
      contact: $localize`:@@admin.section.contact:Contato`,
    };

    return labels[section.type];
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
    this.sectionForm.controls.practiceAreas.removeAt(index);
  }

  protected addMetric(): void {
    this.sectionForm.controls.metrics.push(this.createMetricForm());
  }

  protected removeMetric(index: number): void {
    this.sectionForm.controls.metrics.removeAt(index);
  }

  protected addStep(): void {
    this.sectionForm.controls.steps.push(this.createStepForm());
  }

  protected removeStep(index: number): void {
    this.sectionForm.controls.steps.removeAt(index);
  }

  protected addChannel(): void {
    this.sectionForm.controls.channels.push(this.createChannelForm());
  }

  protected removeChannel(index: number): void {
    this.sectionForm.controls.channels.removeAt(index);
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
