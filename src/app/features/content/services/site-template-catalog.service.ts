import { Injectable } from '@angular/core';

import { SiteTemplatePreset } from '../models/site-template-preset.model';

const BRAND_FONT = "'Century Gothic', CenturyGothic, 'Avenir Next', Futura, sans-serif";
const DATA_FONT =
  "'Cascadia Mono', 'Aptos Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', monospace";

@Injectable({
  providedIn: 'root',
})
export class SiteTemplateCatalogService {
  public readonly presets: readonly SiteTemplatePreset[] = [
    {
      id: 'lucas-camargo-v1',
      name: $localize`:@@admin.templates.editorial.name:Editorial`,
      description: $localize`:@@admin.templates.editorial.description:Composição autoral de grande escala, respiro equilibrado e o coral como assinatura visual.`,
      bestFor: $localize`:@@admin.templates.editorial.bestFor:Apresentação completa do escritório`,
      theme: {
        presetId: 'lucas-camargo-v1',
        colors: {
          accent: '#e36571',
          accentSoft: '#f8e4e6',
          ink: '#333332',
          inkDeep: '#262625',
          surfaceMuted: '#f5f4f4',
          surface: '#ffffff',
          textMuted: '#6a6a68',
          border: 'rgb(51 51 50 / 20%)',
          focus: '#e36571',
        },
        typography: {
          brandFontFamily: BRAND_FONT,
          dataFontFamily: DATA_FONT,
        },
        layout: {
          contentMaxWidthPx: 1440,
          pageGutterMinPx: 22,
          pageGutterPreferredVw: 4.5,
          pageGutterMaxPx: 76,
        },
        motion: {
          revealEnabled: true,
          revealDurationMs: 750,
          revealTransformDurationMs: 950,
        },
      },
    },
    {
      id: 'gallery-v1',
      name: $localize`:@@admin.templates.gallery.name:Galeria`,
      description: $localize`:@@admin.templates.gallery.description:Enquadramento mais amplo e margens compactas para dar protagonismo ao acervo fotográfico.`,
      bestFor: $localize`:@@admin.templates.gallery.bestFor:Portfólio com muitas imagens`,
      theme: {
        presetId: 'gallery-v1',
        colors: {
          accent: '#e36571',
          accentSoft: '#f3d8dc',
          ink: '#2c2c2b',
          inkDeep: '#1f1f1e',
          surfaceMuted: '#ecebea',
          surface: '#ffffff',
          textMuted: '#5d5d5b',
          border: 'rgb(44 44 43 / 24%)',
          focus: '#e36571',
        },
        typography: {
          brandFontFamily: BRAND_FONT,
          dataFontFamily: DATA_FONT,
        },
        layout: {
          contentMaxWidthPx: 1760,
          pageGutterMinPx: 16,
          pageGutterPreferredVw: 3,
          pageGutterMaxPx: 52,
        },
        motion: {
          revealEnabled: true,
          revealDurationMs: 550,
          revealTransformDurationMs: 800,
        },
      },
    },
    {
      id: 'minimal-v1',
      name: $localize`:@@admin.templates.minimal.name:Minimal`,
      description: $localize`:@@admin.templates.minimal.description:Ritmo silencioso, coluna de leitura contida e transições discretas para uma presença essencial.`,
      bestFor: $localize`:@@admin.templates.minimal.bestFor:Narrativa objetiva e institucional`,
      theme: {
        presetId: 'minimal-v1',
        colors: {
          accent: '#e36571',
          accentSoft: '#f8e4e6',
          ink: '#3a3a38',
          inkDeep: '#2f2f2d',
          surfaceMuted: '#faf9f8',
          surface: '#ffffff',
          textMuted: '#73736f',
          border: 'rgb(51 51 50 / 14%)',
          focus: '#e36571',
        },
        typography: {
          brandFontFamily: BRAND_FONT,
          dataFontFamily: DATA_FONT,
        },
        layout: {
          contentMaxWidthPx: 1160,
          pageGutterMinPx: 24,
          pageGutterPreferredVw: 6,
          pageGutterMaxPx: 104,
        },
        motion: {
          revealEnabled: true,
          revealDurationMs: 420,
          revealTransformDurationMs: 520,
        },
      },
    },
    {
      id: 'contrast-v1',
      name: $localize`:@@admin.templates.contrast.name:Contraste`,
      description: $localize`:@@admin.templates.contrast.description:Blocos gráficos firmes, divisões marcadas e escala arquitetônica para uma leitura de alto impacto.`,
      bestFor: $localize`:@@admin.templates.contrast.bestFor:Lançamentos e posicionamento de marca`,
      theme: {
        presetId: 'contrast-v1',
        colors: {
          accent: '#e36571',
          accentSoft: '#f4d9dc',
          ink: '#2a2a29',
          inkDeep: '#1f1f1e',
          surfaceMuted: '#e8e6e4',
          surface: '#ffffff',
          textMuted: '#5b5b58',
          border: 'rgb(42 42 41 / 34%)',
          focus: '#e36571',
        },
        typography: {
          brandFontFamily: BRAND_FONT,
          dataFontFamily: DATA_FONT,
        },
        layout: {
          contentMaxWidthPx: 1500,
          pageGutterMinPx: 16,
          pageGutterPreferredVw: 5.5,
          pageGutterMaxPx: 92,
        },
        motion: {
          revealEnabled: true,
          revealDurationMs: 850,
          revealTransformDurationMs: 1100,
        },
      },
    },
  ];
}
