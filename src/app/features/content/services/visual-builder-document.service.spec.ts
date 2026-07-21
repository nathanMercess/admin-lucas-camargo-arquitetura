import { TestBed } from '@angular/core/testing';
import { VisualBuilderDocument } from '@shared/models/visual-builder-document.model';

import { VisualBuilderDocumentService } from './visual-builder-document.service';

describe('VisualBuilderDocumentService', () => {
  let service: VisualBuilderDocumentService;

  beforeEach(() => {
    service = TestBed.inject(VisualBuilderDocumentService);
  });

  it('migrates the previous builder shape without losing project data', () => {
    const legacyDocument = {
      enabled: true,
      projectData: { pages: [{ id: 'legacy' }] },
      html: '<main>Conteúdo anterior</main>',
      css: 'main{color:#333}',
    };

    const normalized = service.normalize(legacyDocument, 'Página inicial');

    expect(normalized?.enabled).toBe(true);
    expect(normalized?.projectData['pages']).toEqual(legacyDocument.projectData.pages);
    expect(normalized?.html).toBe(legacyDocument.html);
    expect(service.pageName(normalized)).toBe('Página inicial');
  });

  it('stores a reusable template as an immutable copy of the current project', () => {
    const document: VisualBuilderDocument = {
      enabled: true,
      projectData: { pages: [{ id: 'home' }] },
      html: '<main>Conteúdo</main>',
      css: 'main{color:#333}',
    };

    const updatedDocument = service.saveAsTemplate(document, 'Residencial');

    const templates = service.savedTemplates(updatedDocument);

    expect(service.savedTemplates(document)).toHaveLength(0);
    expect(templates).toHaveLength(1);
    expect(templates[0].name).toBe('Residencial');
    expect(templates[0].projectData).toEqual(document.projectData);
    expect(templates[0].projectData).not.toBe(document.projectData);
  });

  it('stores admin metadata inside the API-compatible editable project data', () => {
    const document = service.create(
      {
        enabled: false,
        projectData: {},
        html: '',
        css: '',
      },
      'Contato',
      { pages: [] },
      '<main></main>',
      '',
    );

    expect(service.pageName(document)).toBe('Contato');
    expect(document.projectData['pages']).toEqual([]);
    expect(document.projectData['__visualBuilderAdmin']).toEqual(expect.objectContaining({
      version: 1,
      page: expect.objectContaining({ slug: '/' }),
    }));
    expect(Object.keys(document).sort()).toEqual(['css', 'enabled', 'html', 'projectData']);
  });
});
