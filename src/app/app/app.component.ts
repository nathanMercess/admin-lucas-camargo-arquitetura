import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';

import { SessionService } from '../core/session/services/session.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AppComponent implements OnInit {
  protected readonly sessionService = inject(SessionService);

  public ngOnInit(): void {
    this.sessionService.load();
  }
}
