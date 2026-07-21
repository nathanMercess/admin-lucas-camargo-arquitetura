import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MediaAsset } from '@shared/models/media-asset.model';
import { MediaReference } from '@shared/models/media-reference.model';
import { PortfolioCategory } from '@shared/models/portfolio-category.model';
import { PortfolioProject } from '@shared/models/portfolio-project.model';
import { SiteSection } from '@shared/models/site-section.model';
import { ConfirmationService } from 'primeng/api';

import { MediaReferenceFormValue } from '../../shared/models/media-reference-form-value.model';
import { ContentDraftService } from '../content/services/content-draft.service';

@Component({
  selector: 'app-projects',
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ProjectsComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly editingProjectId = signal<string | null>(null);
  private readonly editingCategoryId = signal<string | null>(null);
  private readonly pendingSave = signal<'project' | 'category' | null>(null);
  private projectReturnFocus: HTMLElement | null = null;
  private categoryReturnFocus: HTMLElement | null = null;

  @ViewChild('projectTitleInput')
  private projectTitleInput?: ElementRef<HTMLInputElement>;

  @ViewChild('categoryTitleInput')
  private categoryTitleInput?: ElementRef<HTMLInputElement>;

  protected readonly draftService = inject(ContentDraftService);
  protected readonly projectRows = signal<PortfolioProject[]>([]);
  protected readonly categoryRows = signal<PortfolioCategory[]>([]);
  protected readonly projectDrawerVisible = signal(false);
  protected readonly categoryDrawerVisible = signal(false);
  protected readonly projectSubmissionPending = computed(() => this.pendingSave() === 'project');
  protected readonly categorySubmissionPending = computed(() => this.pendingSave() === 'category');
  protected readonly projectDrawerTitle = computed(() => this.editingProjectId()
    ? $localize`:@@admin.projects.editProjectTitle:Editar projeto`
    : $localize`:@@admin.projects.createProjectTitle:Adicionar projeto`);
  protected readonly projectDrawerDescription = computed(() => this.editingProjectId()
    ? $localize`:@@admin.projects.editProjectDescription:Atualize o conteúdo, as imagens e a publicação deste projeto.`
    : $localize`:@@admin.projects.createProjectDescription:Cadastre as informações e imagens do novo projeto.`);
  protected readonly projectSubmitLabel = computed(() => this.editingProjectId()
    ? $localize`:@@admin.projects.updateProject:Salvar alterações do projeto`
    : $localize`:@@admin.projects.createProject:Adicionar projeto`);
  protected readonly categoryDrawerTitle = computed(() => this.editingCategoryId()
    ? $localize`:@@admin.projects.editCategoryTitle:Editar categoria`
    : $localize`:@@admin.projects.createCategoryTitle:Criar categoria`);
  protected readonly categoryDrawerDescription = computed(() => this.editingCategoryId()
    ? $localize`:@@admin.projects.editCategoryDescription:Atualize o nome, a descrição e a imagem desta categoria.`
    : $localize`:@@admin.projects.createCategoryDescription:Crie uma categoria para organizar os projetos do portfólio.`);
  protected readonly categorySubmitLabel = computed(() => this.editingCategoryId()
    ? $localize`:@@admin.projects.updateCategory:Salvar alterações da categoria`
    : $localize`:@@admin.projects.createCategory:Criar categoria`);
  protected readonly mediaOptions = computed(() => [...(this.draftService.draft()?.media ?? [])]);
  protected readonly approvedVisualClasses = [
    {
      label: $localize`:@@admin.projects.visual.projects:Claro`,
      value: 'portfolio-accordion-panel--projects',
    },
    {
      label: $localize`:@@admin.projects.visual.construction:Contraste`,
      value: 'portfolio-accordion-panel--construction',
    },
  ];

  protected readonly projectForm = this.formBuilder.nonNullable.group({
    id: ['', [
      Validators.required,
      Validators.maxLength(64),
      Validators.pattern(/^[a-z0-9][a-z0-9-]*$/),
    ]],
    slug: ['', [
      Validators.required,
      Validators.maxLength(64),
      Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    ]],
    title: ['', [Validators.required, Validators.maxLength(120)]],
    summary: ['', [Validators.required, Validators.maxLength(240)]],
    description: ['', Validators.required],
    categoryIds: this.formBuilder.nonNullable.control<string[]>([], Validators.required),
    location: ['', [Validators.required, Validators.maxLength(120)]],
    year: ['', [Validators.required, Validators.pattern(/^[0-9]{4}$/)]],
    services: ['', Validators.required],
    order: [10, [Validators.required, Validators.min(0)]],
    visible: [true],
    cover: this.createMediaReferenceForm(),
    gallery: this.formBuilder.array([this.createMediaReferenceForm()]),
    seo: this.formBuilder.nonNullable.group({
      title: ['', [Validators.required, Validators.maxLength(70)]],
      description: ['', [Validators.required, Validators.maxLength(170)]],
      canonicalPath: ['', [Validators.required, Validators.pattern(/^\/.+/)]],
      imageMediaId: ['', Validators.required],
      noIndex: [false],
    }),
  });

  protected readonly categoryForm = this.formBuilder.nonNullable.group({
    id: ['', [
      Validators.required,
      Validators.maxLength(64),
      Validators.pattern(/^[a-z0-9][a-z0-9-]*$/),
    ]],
    index: ['', [Validators.required, Validators.maxLength(8)]],
    title: ['', [Validators.required, Validators.maxLength(80)]],
    description: ['', [Validators.required, Validators.maxLength(240)]],
    visualClass: ['portfolio-accordion-panel--projects', Validators.required],
    coverMediaId: [''],
  });

  public constructor() {
    effect(() => {
      const draft = this.draftService.draft();

      if (!draft)
        return;

      this.projectRows.set([...draft.projects].sort((first, second) => first.order - second.order));
      this.categoryRows.set([...draft.portfolioCategories]);
    });

    effect(() => {
      const pendingSave = this.pendingSave();

      if (!pendingSave || this.draftService.saving())
        return;

      if (this.draftService.dirty()) {
        if (this.draftService.error())
          this.pendingSave.set(null);

        return;
      }

      if (pendingSave === 'project')
        this.closeProjectDrawer();
      else
        this.closeCategoryDrawer();
    });
  }

  public ngOnInit(): void {
    this.draftService.load();
  }

  protected openNewProject(): void {
    if (this.draftService.saving())
      return;

    this.projectReturnFocus = this.activeElement();
    this.editingProjectId.set(null);
    this.projectForm.controls.id.enable();
    this.projectForm.reset({
      id: crypto.randomUUID(),
      slug: '',
      title: '',
      summary: '',
      description: '',
      categoryIds: [],
      location: '',
      year: new Date().getFullYear().toString(),
      services: '',
      order: this.nextProjectOrder(),
      visible: true,
      cover: this.emptyMediaReference(),
      seo: {
        title: '',
        description: '',
        canonicalPath: '/portfolio/projeto/',
        imageMediaId: '',
        noIndex: false,
      },
    });
    this.resetGallery([]);
    this.projectDrawerVisible.set(true);
  }

  protected editProject(project: PortfolioProject): void {
    if (this.draftService.saving())
      return;

    this.projectReturnFocus = this.activeElement();
    this.editingProjectId.set(project.id);
    this.projectForm.controls.id.disable();
    this.projectForm.reset({
      id: project.id,
      slug: project.slug,
      title: project.title,
      summary: project.summary,
      description: project.description.join('\n'),
      categoryIds: [...project.categoryIds],
      location: project.location,
      year: project.year,
      services: project.services.join('\n'),
      order: project.order,
      visible: project.visible,
      cover: project.cover,
      seo: project.seo,
    });
    this.resetGallery(project.gallery);
    this.projectDrawerVisible.set(true);
  }

  protected saveProject(): void {
    const draft = this.draftService.draft();

    if (!draft || this.draftService.saving() || this.pendingSave())
      return;

    if (this.hasProjectConflict(draft.projects) || this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      return;
    }

    const value = this.projectForm.getRawValue();
    const canonicalPath = `/portfolio/projeto/${value.slug.trim()}`;
    const project: PortfolioProject = {
      id: value.id.trim(),
      slug: value.slug.trim(),
      title: value.title.trim(),
      summary: value.summary.trim(),
      description: this.lines(value.description),
      categoryIds: value.categoryIds,
      cover: this.toMediaReference(value.cover),
      gallery: value.gallery.map((reference) => this.toMediaReference(reference)),
      location: value.location.trim(),
      year: value.year.trim(),
      services: this.lines(value.services),
      order: value.order,
      visible: value.visible,
      seo: {
        title: value.seo.title.trim(),
        description: value.seo.description.trim(),
        canonicalPath,
        imageMediaId: value.seo.imageMediaId.trim(),
        noIndex: value.seo.noIndex,
      },
    };
    const editingId = this.editingProjectId();
    const projects = editingId
      ? draft.projects.map((current) => current.id === editingId ? project : current)
      : [...draft.projects, project];

    this.draftService.updateDraft({ ...draft, projects });
    this.pendingSave.set('project');
    this.draftService.save();
  }

  protected handleProjectDrawerVisibleChange(visible: boolean): void {
    if (visible) {
      this.projectDrawerVisible.set(true);
      return;
    }

    if (this.projectSubmissionPending()) {
      this.projectDrawerVisible.set(true);
      return;
    }

    this.closeProjectDrawer();
  }

  protected focusProjectTitle(): void {
    this.projectTitleInput?.nativeElement.focus();
  }

  protected synchronizeCanonicalPath(): void {
    const slug = this.projectForm.controls.slug.value.trim();
    const canonicalPath = slug ? `/portfolio/projeto/${slug}` : '/portfolio/projeto/';

    this.projectForm.controls.seo.controls.canonicalPath.setValue(canonicalPath);
  }

  protected synchronizeProjectTitle(): void {
    if (this.editingProjectId())
      return;

    const title = this.projectForm.controls.title.value.trim();
    const slug = title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 64);
    this.projectForm.controls.slug.setValue(slug);
    this.projectForm.controls.seo.controls.title.setValue(title.slice(0, 70));
    this.synchronizeCanonicalPath();
  }

  protected toggleProjectCategory(categoryId: string, selected: boolean): void {
    const currentIds = this.projectForm.controls.categoryIds.value;
    const categoryIds = selected
      ? [...currentIds, categoryId]
      : currentIds.filter((currentId) => currentId !== categoryId);
    this.projectForm.controls.categoryIds.setValue([...new Set(categoryIds)]);
    this.projectForm.controls.categoryIds.markAsDirty();
  }

  protected requestDeleteProject(project: PortfolioProject): void {
    if (this.draftService.saving())
      return;

    this.confirmationService.confirm({
      key: 'project-actions',
      header: $localize`:@@admin.projects.deleteTitle:Excluir projeto?`,
      message: $localize`:@@admin.projects.deleteMessage:O projeto ${project.title} será removido do rascunho.`,
      acceptLabel: $localize`:@@admin.projects.deleteProjectAccept:Excluir projeto`,
      rejectLabel: $localize`:@@admin.projects.cancel:Cancelar`,
      accept: () => {
        const draft = this.draftService.draft();

        if (!draft || this.draftService.saving())
          return;

        this.draftService.updateDraft({
          ...draft,
          projects: draft.projects.filter((current) => current.id !== project.id),
        });
        this.draftService.save();
      },
    });
  }

  protected toggleProjectVisibility(project: PortfolioProject): void {
    const draft = this.draftService.draft();

    if (!draft || this.draftService.saving())
      return;

    const projects = draft.projects.map((current) => current.id === project.id
      ? { ...current, visible: !current.visible }
      : current);
    this.draftService.updateDraft({ ...draft, projects });
    this.draftService.save();
  }

  protected handleProjectReorder(): void {
    const draft = this.draftService.draft();

    if (!draft || this.draftService.saving())
      return;

    const projects = this.projectRows().map((project, index) => ({
      ...project,
      order: (index + 1) * 10,
    }));
    this.projectRows.set(projects);
    this.draftService.updateDraft({ ...draft, projects });
    this.draftService.save();
  }

  protected openNewCategory(): void {
    if (this.draftService.saving())
      return;

    this.categoryReturnFocus = this.activeElement();
    this.editingCategoryId.set(null);
    this.categoryForm.controls.id.enable();
    this.categoryForm.reset({
      id: crypto.randomUUID(),
      index: String(this.categoryRows().length + 1).padStart(2, '0'),
      title: '',
      description: '',
      visualClass: 'portfolio-accordion-panel--projects',
      coverMediaId: '',
    });
    this.categoryDrawerVisible.set(true);
  }

  protected editCategory(category: PortfolioCategory): void {
    if (this.draftService.saving())
      return;

    this.categoryReturnFocus = this.activeElement();
    this.editingCategoryId.set(category.id);
    this.categoryForm.controls.id.disable();
    this.categoryForm.reset({
      id: category.id,
      index: category.index,
      title: category.title,
      description: category.description,
      visualClass: category.visualClass,
      coverMediaId: category.coverMediaId ?? '',
    });
    this.categoryDrawerVisible.set(true);
  }

  protected saveCategory(): void {
    const draft = this.draftService.draft();

    if (!draft || this.draftService.saving() || this.pendingSave())
      return;

    if (this.hasCategoryConflict(draft.portfolioCategories) || this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    const value = this.categoryForm.getRawValue();
    const category: PortfolioCategory = {
      id: value.id.trim(),
      index: value.index.trim(),
      title: value.title.trim(),
      description: value.description.trim(),
      visualClass: value.visualClass,
      ...(value.coverMediaId.trim() ? { coverMediaId: value.coverMediaId.trim() } : {}),
    };
    const editingId = this.editingCategoryId();
    const categories = editingId
      ? draft.portfolioCategories.map((current) => current.id === editingId ? category : current)
      : [...draft.portfolioCategories, category];

    this.draftService.updateDraft({ ...draft, portfolioCategories: categories });
    this.pendingSave.set('category');
    this.draftService.save();
  }

  protected handleCategoryDrawerVisibleChange(visible: boolean): void {
    if (visible) {
      this.categoryDrawerVisible.set(true);
      return;
    }

    if (this.categorySubmissionPending()) {
      this.categoryDrawerVisible.set(true);
      return;
    }

    this.closeCategoryDrawer();
  }

  protected focusCategoryTitle(): void {
    this.categoryTitleInput?.nativeElement.focus();
  }

  protected requestDeleteCategory(category: PortfolioCategory): void {
    if (this.draftService.saving())
      return;

    this.confirmationService.confirm({
      key: 'project-actions',
      header: $localize`:@@admin.projects.categoryDeleteTitle:Excluir categoria?`,
      message: $localize`:@@admin.projects.categoryDeleteMessage:A categoria ${category.title} será removida dos projetos e da navegação do portfólio.`,
      acceptLabel: $localize`:@@admin.projects.deleteCategoryAccept:Excluir categoria`,
      rejectLabel: $localize`:@@admin.projects.cancel:Cancelar`,
      accept: () => this.deleteCategory(category.id),
    });
  }

  protected handleCategoryReorder(): void {
    const draft = this.draftService.draft();

    if (!draft || this.draftService.saving())
      return;

    const portfolioCategories = this.categoryRows().map((category, index) => ({
      ...category,
      index: String(index + 1).padStart(2, '0'),
    }));
    this.categoryRows.set(portfolioCategories);
    this.draftService.updateDraft({ ...draft, portfolioCategories });
    this.draftService.save();
  }

  protected categoryVisible(categoryId: string): boolean {
    const section = this.portfolioSection();
    return section?.categoryIds.includes(categoryId) ?? false;
  }

  protected toggleCategoryVisibility(categoryId: string): void {
    const draft = this.draftService.draft();
    const portfolio = this.portfolioSection();

    if (!draft || !portfolio || this.draftService.saving())
      return;

    const categoryIds = portfolio.categoryIds.includes(categoryId)
      ? portfolio.categoryIds.filter((id) => id !== categoryId)
      : [...portfolio.categoryIds, categoryId];
    const sections = draft.sections.map((section) => section.id === portfolio.id
      ? { ...portfolio, categoryIds }
      : section);
    this.draftService.updateDraft({ ...draft, sections });
    this.draftService.save();
  }

  protected addGalleryReference(): void {
    this.projectForm.controls.gallery.push(this.createMediaReferenceForm());
  }

  protected registerUploadedAsset(asset: MediaAsset): void {
    this.draftService.registerAndSaveMediaAsset(asset);
  }

  protected removeGalleryReference(index: number): void {
    this.projectForm.controls.gallery.removeAt(index);
  }

  private deleteCategory(categoryId: string): void {
    const draft = this.draftService.draft();

    if (!draft || this.draftService.saving())
      return;

    const projects = draft.projects.map((project) => ({
      ...project,
      categoryIds: project.categoryIds.filter((id) => id !== categoryId),
    }));
    const sections = draft.sections.map((section): SiteSection => section.type === 'portfolio'
      ? { ...section, categoryIds: section.categoryIds.filter((id) => id !== categoryId) }
      : section);
    this.draftService.updateDraft({
      ...draft,
      portfolioCategories: draft.portfolioCategories.filter((category) => category.id !== categoryId),
      projects,
      sections,
    });
    this.draftService.save();
  }

  private portfolioSection() {
    return this.draftService.draft()?.sections.find((section) => section.type === 'portfolio');
  }

  private nextProjectOrder(): number {
    return Math.max(0, ...this.projectRows().map((project) => project.order)) + 10;
  }

  private hasProjectConflict(projects: readonly PortfolioProject[]): boolean {
    const value = this.projectForm.getRawValue();
    const editingId = this.editingProjectId();
    const remainingProjects = projects.filter((project) => project.id !== editingId);
    const duplicateId = remainingProjects.some((project) => project.id === value.id.trim());
    const duplicateSlug = remainingProjects.some((project) => project.slug === value.slug.trim());
    const duplicateOrder = remainingProjects.some((project) => project.order === value.order);

    if (duplicateId)
      this.projectForm.controls.id.setErrors({ duplicate: true });

    if (duplicateSlug)
      this.projectForm.controls.slug.setErrors({ duplicate: true });

    if (duplicateOrder)
      this.projectForm.controls.order.setErrors({ duplicate: true });

    return duplicateId || duplicateSlug || duplicateOrder;
  }

  private hasCategoryConflict(categories: readonly PortfolioCategory[]): boolean {
    const value = this.categoryForm.getRawValue();
    const editingId = this.editingCategoryId();
    const duplicateId = categories.some((category) =>
      category.id !== editingId && category.id === value.id.trim());

    if (duplicateId)
      this.categoryForm.controls.id.setErrors({ duplicate: true });

    return duplicateId;
  }

  private createMediaReferenceForm(reference: MediaReference = this.emptyMediaReference()) {
    return this.formBuilder.nonNullable.group({
      assetId: [reference.assetId, Validators.required],
      alt: [reference.alt, Validators.maxLength(240)],
      decorative: [reference.decorative],
      focalPointX: [reference.focalPointX, [Validators.required, Validators.min(0), Validators.max(100)]],
      focalPointY: [reference.focalPointY, [Validators.required, Validators.min(0), Validators.max(100)]],
      caption: [reference.caption ?? '', Validators.maxLength(240)],
    });
  }

  private resetGallery(references: readonly MediaReference[]): void {
    const gallery = this.projectForm.controls.gallery;
    gallery.clear();
    references.forEach((reference) => gallery.push(this.createMediaReferenceForm(reference)));
  }

  private emptyMediaReference(): MediaReference {
    return {
      assetId: '',
      alt: '',
      decorative: false,
      focalPointX: 50,
      focalPointY: 50,
    };
  }

  private toMediaReference(value: MediaReferenceFormValue): MediaReference {
    return {
      assetId: value.assetId.trim(),
      alt: value.decorative ? '' : value.alt.trim(),
      decorative: value.decorative,
      focalPointX: value.focalPointX,
      focalPointY: value.focalPointY,
      ...(value.caption.trim() ? { caption: value.caption.trim() } : {}),
    };
  }

  private lines(value: string): readonly string[] {
    return value.split('\n').map((line) => line.trim()).filter(Boolean);
  }

  private closeProjectDrawer(): void {
    this.projectDrawerVisible.set(false);
    this.pendingSave.set(null);
    this.editingProjectId.set(null);
    this.projectForm.markAsPristine();
    this.projectForm.markAsUntouched();
    this.restoreFocus(this.projectReturnFocus);
    this.projectReturnFocus = null;
  }

  private closeCategoryDrawer(): void {
    this.categoryDrawerVisible.set(false);
    this.pendingSave.set(null);
    this.editingCategoryId.set(null);
    this.categoryForm.markAsPristine();
    this.categoryForm.markAsUntouched();
    this.restoreFocus(this.categoryReturnFocus);
    this.categoryReturnFocus = null;
  }

  private activeElement(): HTMLElement | null {
    return document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }

  private restoreFocus(element: HTMLElement | null): void {
    if (!element)
      return;

    queueMicrotask(() => element.focus());
  }
}
