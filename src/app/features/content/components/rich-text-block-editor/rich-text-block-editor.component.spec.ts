import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RichTextBlock } from '@shared/models/rich-text-block.model';

import { ContentModule } from '../../content.module';
import { RichTextBlockEditorComponent } from './rich-text-block-editor.component';

describe('RichTextBlockEditorComponent', () => {
  let fixture: ComponentFixture<RichTextBlockEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ContentModule] }).compileComponents();

    fixture = TestBed.createComponent(RichTextBlockEditorComponent);
    fixture.componentRef.setInput('label', 'Título principal');
    fixture.componentRef.setInput('block', {
      lines: [{ segments: [{ text: 'Espaços que permanecem.', emphasis: true }] }],
    });
    fixture.detectChanges();
  });

  it('renders the safe model as an editable visual text', () => {
    const editor = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.rich-text-canvas');

    expect(editor?.textContent).toBe('Espaços que permanecem.');
    expect(editor?.querySelector('strong')?.textContent).toBe('Espaços que permanecem.');
  });

  it('converts visual edits back to typed lines and emphasis', () => {
    const changes: RichTextBlock[] = [];
    const editor = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.rich-text-canvas')!;
    fixture.componentInstance.blockChange.subscribe((block) => changes.push(block));

    editor.innerHTML = '<div>Texto normal <strong>em destaque</strong></div><div>Nova linha</div>';
    editor.dispatchEvent(new InputEvent('input', { bubbles: true }));

    expect(changes).toHaveLength(1);
    expect(changes[0]).toEqual({
      lines: [
        {
          segments: [
            { text: 'Texto normal ', emphasis: false },
            { text: 'em destaque', emphasis: true },
          ],
        },
        { segments: [{ text: 'Nova linha', emphasis: false }] },
      ],
    });
  });
});
