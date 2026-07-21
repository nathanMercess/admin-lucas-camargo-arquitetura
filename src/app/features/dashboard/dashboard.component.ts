import { ChangeDetectionStrategy, Component } from '@angular/core';

import { DashboardStep } from './models/dashboard-step.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class DashboardComponent {
  protected readonly implementationProgress = 100;

  protected readonly steps: DashboardStep[] = [
    {
      id: 'public-site',
      title: $localize`:@@admin.dashboard.step.publicSite:Site público`,
      description: $localize`:@@admin.dashboard.step.publicSite.description:Cloud Run publicado com escala a zero e URL HTTPS ativa.`,
      status: $localize`:@@admin.status.complete:Concluído`,
      state: 'complete',
    },
    {
      id: 'content-contract',
      title: $localize`:@@admin.dashboard.step.contract:Contrato de conteúdo`,
      description: $localize`:@@admin.dashboard.step.contract.description:JSON tipado, versionado e validado entre site, painel, API e armazenamento.`,
      status: $localize`:@@admin.status.complete:Concluído`,
      state: 'complete',
    },
    {
      id: 'publication',
      title: $localize`:@@admin.dashboard.step.publication:Painel, publicação e auditoria`,
      description: $localize`:@@admin.dashboard.step.publication.description:Edição, preview, mídia, publicação atômica, histórico, restauração e auditoria disponíveis em produção.`,
      status: $localize`:@@admin.status.complete:Concluído`,
      state: 'complete',
    },
    {
      id: 'r2',
      title: $localize`:@@admin.dashboard.step.r2:R2 e deploy protegido`,
      description: $localize`:@@admin.dashboard.step.r2.description:Buckets privados, upload assinado, Worker CDN e Cloud Run com IAP estão conectados.`,
      status: $localize`:@@admin.status.complete:Concluído`,
      state: 'complete',
    },
  ];
}
