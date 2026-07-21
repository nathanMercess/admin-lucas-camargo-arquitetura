import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  OnDestroy,
  output,
  ViewChild,
} from '@angular/core';
import grapesjs, { Editor, ProjectData } from 'grapesjs';

import { VisualBuilderDocument } from '@shared/models/visual-builder-document.model';
import { SiteConfigV1 } from '@shared/models/site-config-v1.model';
import { SiteSection } from '@shared/models/site-section.model';

@Component({
  selector: 'app-visual-page-builder',
  standalone: false,
  templateUrl: './visual-page-builder.component.html',
  styleUrl: './visual-page-builder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisualPageBuilderComponent implements AfterViewInit, OnDestroy {
  @ViewChild('editorHost', { static: true })
  private readonly editorHost!: ElementRef<HTMLElement>;

  private editor: Editor | null = null;
  private emitTimer: ReturnType<typeof setTimeout> | null = null;

  public readonly document = input<VisualBuilderDocument | undefined>();
  public readonly config = input.required<SiteConfigV1>();
  public readonly documentChange = output<VisualBuilderDocument>();

  public ngAfterViewInit(): void {
    if (!this.editorHost.nativeElement.ownerDocument.defaultView?.matchMedia)
      return;

    const existing = this.document();
    this.editor = grapesjs.init({
      container: this.editorHost.nativeElement,
      height: '72vh',
      width: 'auto',
      storageManager: false,
      fromElement: false,
      projectData: existing?.projectData as ProjectData | undefined,
      components: existing ? undefined : this.createStarterPage(),
      style: existing ? undefined : this.createStarterStyles(),
      deviceManager: {
        devices: [
          { id: 'desktop', name: 'Computador', width: '' },
          { id: 'tablet', name: 'Tablet', width: '768px', widthMedia: '900px' },
          { id: 'mobile', name: 'Celular', width: '390px', widthMedia: '480px' },
        ],
      },
      selectorManager: { componentFirst: true },
      canvas: {
        styles: [
          'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Manrope:wght@400;500;600;700&display=swap',
        ],
      },
    });

    this.configureBlocks(this.editor);
    this.configureCommands(this.editor);
    this.translateEditor(this.editor);
    this.editor.runCommand('open-blocks');
    this.editor.on('update', () => this.scheduleChange());
    this.scheduleChange();
  }

  public ngOnDestroy(): void {
    if (this.emitTimer)
      clearTimeout(this.emitTimer);

    this.editor?.destroy();
  }

  private configureBlocks(editor: Editor): void {
    const blocks = editor.BlockManager;
    blocks.add('layout-section', {
      label: 'Seção',
      category: 'Estrutura',
      media: '<span class="pi pi-stop"></span>',
      content: '<section class="lc-section"><h2>Nova seção</h2><p>Comece a escrever aqui.</p></section>',
    });
    blocks.add('layout-columns', {
      label: 'Duas colunas',
      category: 'Estrutura',
      media: '<span class="pi pi-th-large"></span>',
      content: '<section class="lc-columns"><div><h2>Título</h2><p>Conteúdo da primeira coluna.</p></div><div class="lc-placeholder">Imagem ou conteúdo</div></section>',
    });
    blocks.add('content-heading', {
      label: 'Título',
      category: 'Conteúdo',
      media: '<span class="pi pi-align-left"></span>',
      content: '<h2 class="lc-heading">Escreva um título</h2>',
    });
    blocks.add('content-text', {
      label: 'Texto',
      category: 'Conteúdo',
      media: '<span class="pi pi-file-edit"></span>',
      content: '<p class="lc-text">Clique duas vezes para editar este texto.</p>',
    });
    blocks.add('content-image', {
      label: 'Imagem',
      category: 'Conteúdo',
      media: '<span class="pi pi-image"></span>',
      activate: true,
      content: { type: 'image', style: { width: '100%', 'min-height': '240px', 'object-fit': 'cover' } },
    });
    blocks.add('content-button', {
      label: 'Botão',
      category: 'Conteúdo',
      media: '<span class="pi pi-link"></span>',
      content: '<a class="lc-button" href="#">Saiba mais</a>',
    });
    blocks.add('portfolio-gallery', {
      label: 'Galeria',
      category: 'Projetos',
      media: '<span class="pi pi-images"></span>',
      content: '<section class="lc-section"><p class="lc-eyebrow">PROJETOS</p><h2>Trabalhos selecionados</h2><div class="lc-gallery"><div>Projeto 01</div><div>Projeto 02</div><div>Projeto 03</div></div></section>',
    });
    blocks.add('contact-block', {
      label: 'Contato',
      category: 'Conteúdo',
      media: '<span class="pi pi-send"></span>',
      content: '<section class="lc-contact"><p>VAMOS CONVERSAR</p><h2>Seu próximo espaço pode começar agora.</h2><a class="lc-button" href="mailto:contato@lucascamargo.com">Entrar em contato</a></section>',
    });
  }

  private configureCommands(editor: Editor): void {
    editor.Panels.addButton('options', [
      {
        id: 'device-desktop-friendly',
        className: 'pi pi-desktop',
        command: () => editor.setDevice('desktop'),
        attributes: { title: 'Ver no computador' },
      },
      {
        id: 'device-tablet-friendly',
        className: 'pi pi-tablet',
        command: () => editor.setDevice('tablet'),
        attributes: { title: 'Ver no tablet' },
      },
      {
        id: 'device-mobile-friendly',
        className: 'pi pi-mobile',
        command: () => editor.setDevice('mobile'),
        attributes: { title: 'Ver no celular' },
      },
    ]);
  }

  private translateEditor(editor: Editor): void {
    editor.I18n.addMessages({
      pt: {
        assetManager: { addButton: 'Adicionar imagem', inputPlh: 'Cole o endereço da imagem' },
        blockManager: { labels: { categories: { Estrutura: 'Estrutura', Conteúdo: 'Conteúdo', Projetos: 'Projetos' } } },
        deviceManager: { device: 'Dispositivo', devices: { desktop: 'Computador', tablet: 'Tablet', mobile: 'Celular' } },
        layerManager: { layers: 'Camadas', root: 'Página' },
        selectorManager: { label: 'Elemento selecionado' },
        styleManager: { empty: 'Selecione um elemento para mudar sua aparência', layer: 'Camada', fileButton: 'Imagens' },
        traitManager: { empty: 'Este elemento não possui outras opções', label: 'Configurações' },
      },
    });
    editor.I18n.setLocale('pt');
  }

  private scheduleChange(): void {
    if (this.emitTimer)
      clearTimeout(this.emitTimer);

    this.emitTimer = setTimeout(() => {
      if (!this.editor)
        return;

      this.documentChange.emit({
        enabled: this.document()?.enabled ?? false,
        projectData: this.editor.getProjectData() as Readonly<Record<string, unknown>>,
        html: `<div class="lc-page">${this.editor.getHtml()}</div>`,
        css: (this.editor.getCss() ?? '').replace(/\bbody(?=\s*[,{])/g, '.lc-page'),
      });
    }, 250);
  }

  private createStarterPage(): string {
    const config = this.config();
    const navigation = config.navigationItems
      .map((item) => `<a href="${this.escapeHtml(item.href)}">${this.escapeHtml(item.label)}</a>`)
      .join('');
    const sections = [...config.sections]
      .filter((section) => section.visible)
      .sort((first, second) => first.order - second.order)
      .map((section) => this.renderSection(section))
      .join('');
    const footerLinks = config.footer.links
      .map((link) => `<a href="${this.escapeHtml(link.href)}">${this.escapeHtml(link.label)}</a>`)
      .join('');

    return `
      <header class="lc-header">
        <a class="lc-brand" href="#inicio">${this.escapeHtml(config.identity.brandName)}</a>
        <nav>${navigation}</nav>
      </header>
      <main>${sections}</main>
      <footer class="lc-footer">
        <strong>${this.escapeHtml(config.identity.brandName)}</strong>
        <p>${this.escapeHtml(config.footer.statement)}</p>
        <nav>${footerLinks}</nav>
        <small>${this.escapeHtml(config.footer.location)}</small>
      </footer>`;
  }

  private createStarterStyles(): string {
    return `
      *{box-sizing:border-box}body{margin:0;color:#333332;background:#f7f6f6;font-family:Manrope,sans-serif}a{color:inherit}.lc-header{display:flex;align-items:center;justify-content:space-between;padding:28px 6vw;border-bottom:1px solid #d8d6d6}.lc-brand{text-decoration:none;font-weight:700}.lc-header nav,.lc-footer nav{display:flex;gap:28px}.lc-header nav a,.lc-footer nav a{text-decoration:none;font-size:12px;letter-spacing:.08em;text-transform:uppercase}.lc-eyebrow,.lc-index{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#e36571}.lc-hero,.lc-columns,.lc-about{display:grid;grid-template-columns:1.2fr .8fr;gap:5vw;align-items:center;min-height:72vh;padding:7vw 6vw;border-bottom:1px solid #d8d6d6}.lc-hero h1{max-width:780px;margin:18px 0;font-size:clamp(54px,8vw,128px);line-height:.88;font-weight:500}.lc-hero-art,.lc-about-art{min-height:420px;background:linear-gradient(135deg,#eee 40%,#e36571 40% 52%,#eee 52%)}.lc-section,.lc-contact,.lc-manifesto,.lc-practice,.lc-portfolio,.lc-process,.lc-metrics{padding:8vw 6vw;border-bottom:1px solid #d8d6d6}.lc-section h2,.lc-contact h2,.lc-manifesto h2,.lc-practice h2,.lc-portfolio h2,.lc-about h2,.lc-process h2,.lc-heading{max-width:980px;font-size:clamp(38px,5vw,76px);line-height:1;font-weight:500}.lc-manifesto{display:grid;grid-template-columns:.45fr 1fr;gap:5vw}.lc-manifesto-copy p{max-width:720px;font-size:18px;line-height:1.65}.lc-editorial-list{display:grid;margin-top:64px;border-top:1px solid #d8d6d6}.lc-editorial-item{display:grid;grid-template-columns:80px .7fr 1fr;gap:28px;padding:28px 0;border-bottom:1px solid #d8d6d6}.lc-editorial-item h3{margin:0;font-size:28px}.lc-editorial-item p{margin:0;color:#777;line-height:1.5}.lc-gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:48px}.lc-gallery>div,.lc-placeholder{display:grid;place-items:end start;min-height:280px;padding:24px;background:#e9e7e7}.lc-metric-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;margin-top:48px;background:#d8d6d6}.lc-metric{display:grid;gap:12px;padding:36px;background:#f7f6f6}.lc-metric strong{font-size:52px;font-weight:500}.lc-step-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:48px}.lc-step{padding:28px;border:1px solid #d8d6d6}.lc-button{display:inline-block;margin-top:24px;padding:14px 22px;color:#fff;background:#333332;text-decoration:none}.lc-text{font-size:20px;line-height:1.6}.lc-contact{color:#fff;background:#333332}.lc-contact .lc-button{color:#333332;background:#fff}.lc-footer{display:grid;grid-template-columns:1fr 1fr;gap:32px;padding:64px 6vw;color:#fff;background:#242423}.lc-footer small{color:#aaa}@media(max-width:700px){.lc-header nav{display:none}.lc-hero,.lc-columns,.lc-about,.lc-manifesto{grid-template-columns:1fr;padding:64px 24px}.lc-hero-art,.lc-about-art{min-height:280px}.lc-section,.lc-contact,.lc-practice,.lc-portfolio,.lc-process,.lc-metrics{padding:64px 24px}.lc-gallery,.lc-metric-grid,.lc-step-grid,.lc-footer{grid-template-columns:1fr}.lc-editorial-item{grid-template-columns:46px 1fr}.lc-editorial-item p{grid-column:2}}`;
  }

  private renderSection(section: SiteSection): string {
    const id = this.escapeHtml(section.anchor);

    switch (section.type) {
      case 'hero':
        return `<section class="lc-hero" id="${id}"><div><p class="lc-eyebrow">${this.escapeHtml(section.overline)}</p><h1>${this.renderRichText(section.title)}</h1><div class="lc-text">${this.renderRichText(section.supportingText)}</div><a class="lc-button" href="${this.escapeHtml(section.portfolioLink.href)}">${this.escapeHtml(section.portfolioLink.label)}</a></div><div class="lc-hero-art"></div></section>`;
      case 'manifesto':
        return `<section class="lc-manifesto" id="${id}"><p class="lc-index">${this.escapeHtml(section.indexLabel)}</p><div class="lc-manifesto-copy"><h2>${this.renderRichText(section.title)}</h2>${section.body.map((paragraph) => `<p>${this.escapeHtml(paragraph)}</p>`).join('')}</div></section>`;
      case 'practice':
        return `<section class="lc-practice" id="${id}"><p class="lc-eyebrow">${this.escapeHtml(section.overline)}</p><h2>${this.renderRichText(section.title)}</h2><div class="lc-editorial-list">${section.practiceAreas.map((item) => `<article class="lc-editorial-item"><span>${this.escapeHtml(item.index)}</span><h3>${this.escapeHtml(item.title)}</h3><p>${this.escapeHtml(item.description)}</p></article>`).join('')}</div></section>`;
      case 'portfolio':
        return `<section class="lc-portfolio" id="${id}"><p class="lc-eyebrow">${this.escapeHtml(section.overline)}</p><h2>${this.renderRichText(section.title)}</h2><div class="lc-gallery">${this.config().portfolioCategories.map((category) => `<div>${this.escapeHtml(category.title)}</div>`).join('')}</div></section>`;
      case 'metrics':
        return `<section class="lc-metrics" id="${id}"><p class="lc-eyebrow">${this.escapeHtml(section.ariaLabel)}</p><div class="lc-metric-grid">${section.metrics.map((metric) => `<div class="lc-metric"><strong>${this.escapeHtml(metric.value)}</strong><span>${this.escapeHtml(metric.label)}</span></div>`).join('')}</div></section>`;
      case 'about':
        return `<section class="lc-about" id="${id}"><div class="lc-about-art"></div><div><p class="lc-eyebrow">${this.escapeHtml(section.profile.name)} · ${this.escapeHtml(section.profile.professionalTitle)}</p><h2>${this.renderRichText(section.title)}</h2><p class="lc-text">${this.escapeHtml(section.profile.biography)}</p></div></section>`;
      case 'process':
        return `<section class="lc-process" id="${id}"><p class="lc-eyebrow">${this.escapeHtml(section.overline)}</p><h2>${this.escapeHtml(section.title)}</h2><div class="lc-step-grid">${section.steps.map((step) => `<article class="lc-step"><span>${this.escapeHtml(step.index)}</span><h3>${this.escapeHtml(step.title)}</h3><p>${this.escapeHtml(step.description)}</p></article>`).join('')}</div></section>`;
      case 'contact':
        return `<section class="lc-contact" id="${id}"><p class="lc-eyebrow">${this.escapeHtml(section.overline)}</p><h2>${this.renderRichText(section.title)}</h2><a class="lc-button" href="${this.escapeHtml(section.cta.href)}">${this.escapeHtml(section.cta.label)}</a></section>`;
    }
  }

  private renderRichText(content: { readonly lines: readonly { readonly segments: readonly { readonly text: string; readonly emphasis: boolean }[] }[] }): string {
    return content.lines
      .map((line) => line.segments
        .map((segment) => segment.emphasis
          ? `<strong>${this.escapeHtml(segment.text)}</strong>`
          : this.escapeHtml(segment.text))
        .join(''))
      .join('<br>');
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    })[character] ?? character);
  }
}
