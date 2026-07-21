import { Injectable } from '@angular/core';
import { VisualBuilderDocument } from '@shared/models/visual-builder-document.model';
import { VisualBuilderSavedTemplate } from '@shared/models/visual-builder-saved-template.model';

import { VisualBuilderAdminMetadata } from '../models/visual-builder-admin-metadata.model';

const ADMIN_METADATA_KEY = '__visualBuilderAdmin';

@Injectable({
  providedIn: 'root',
})
export class VisualBuilderDocumentService {
  public normalize(
    document: Partial<VisualBuilderDocument> | undefined,
    fallbackPageName: string,
  ): VisualBuilderDocument | undefined {
    if (!document)
      return undefined;

    const legacyDocument = document as Partial<VisualBuilderDocument> & {
      readonly page?: VisualBuilderAdminMetadata['page'];
      readonly savedTemplates?: readonly VisualBuilderSavedTemplate[];
    };
    const metadata = this.readMetadata(document, fallbackPageName) ?? {
      version: 1,
      page: {
        id: legacyDocument.page?.id || 'home',
        name: legacyDocument.page?.name || fallbackPageName,
        slug: this.normalizeSlug(legacyDocument.page?.slug || '/'),
      },
      savedTemplates: legacyDocument.savedTemplates ?? [],
    };

    return {
      enabled: document.enabled ?? false,
      projectData: this.withMetadata(document.projectData ?? {}, metadata),
      html: document.html ?? '',
      css: document.css ?? '',
    };
  }

  public create(
    current: VisualBuilderDocument | undefined,
    pageName: string,
    projectData: Readonly<Record<string, unknown>>,
    html: string,
    css: string,
  ): VisualBuilderDocument {
    const metadata = this.metadata(current, pageName);

    return {
      enabled: current?.enabled ?? false,
      projectData: this.withMetadata(projectData, {
        ...metadata,
        page: {
          ...metadata.page,
          name: pageName.trim() || 'Página sem título',
        },
      }),
      html,
      css,
    };
  }

  public saveAsTemplate(document: VisualBuilderDocument, name: string): VisualBuilderDocument {
    const template: VisualBuilderSavedTemplate = {
      id: `custom-${Date.now()}`,
      name: name.trim() || 'Meu modelo',
      createdAt: new Date().toISOString(),
      projectData: structuredClone(document.projectData),
      html: document.html,
      css: document.css,
    };

    return {
      ...document,
      projectData: this.withMetadata(document.projectData, {
        ...this.metadata(document),
        savedTemplates: [...this.savedTemplates(document), template],
      }),
    };
  }

  public withEnabled(document: VisualBuilderDocument, enabled: boolean): VisualBuilderDocument {
    return { ...document, enabled };
  }

  public withPageName(document: VisualBuilderDocument, name: string): VisualBuilderDocument {
    const metadata = this.metadata(document);

    return {
      ...document,
      projectData: this.withMetadata(document.projectData, {
        ...metadata,
        page: { ...metadata.page, name: name.trim() || metadata.page.name },
      }),
    };
  }

  public pageName(document: VisualBuilderDocument | undefined, fallback = 'Página inicial'): string {
    return this.metadata(document, fallback).page.name;
  }

  public savedTemplates(
    document: VisualBuilderDocument | undefined,
  ): readonly VisualBuilderSavedTemplate[] {
    return this.metadata(document).savedTemplates;
  }

  public hasEditableData(document: VisualBuilderDocument | undefined): boolean {
    if (!document)
      return false;

    return Object.keys(document.projectData).some((key) => key !== ADMIN_METADATA_KEY);
  }

  private metadata(
    document: VisualBuilderDocument | undefined,
    fallbackPageName = 'Página inicial',
  ): VisualBuilderAdminMetadata {
    return this.readMetadata(document, fallbackPageName) ?? {
      version: 1,
      page: { id: 'home', name: fallbackPageName, slug: '/' },
      savedTemplates: [],
    };
  }

  private readMetadata(
    document: Partial<VisualBuilderDocument> | undefined,
    fallbackPageName: string,
  ): VisualBuilderAdminMetadata | null {
    const value = document?.projectData?.[ADMIN_METADATA_KEY];

    if (!value || typeof value !== 'object' || Array.isArray(value))
      return null;

    const metadata = value as Partial<VisualBuilderAdminMetadata>;

    if (metadata.version !== 1 || !metadata.page)
      return null;

    return {
      version: 1,
      page: {
        id: metadata.page.id || 'home',
        name: metadata.page.name || fallbackPageName,
        slug: this.normalizeSlug(metadata.page.slug || '/'),
      },
      savedTemplates: metadata.savedTemplates ?? [],
    };
  }

  private withMetadata(
    projectData: Readonly<Record<string, unknown>>,
    metadata: VisualBuilderAdminMetadata,
  ): Readonly<Record<string, unknown>> {
    return { ...projectData, [ADMIN_METADATA_KEY]: metadata };
  }

  private normalizeSlug(value: string): string {
    const normalizedValue = value.trim();

    if (!normalizedValue || normalizedValue === '/')
      return '/';

    return `/${normalizedValue.replace(/^\/+|\/+$/g, '')}`;
  }
}
