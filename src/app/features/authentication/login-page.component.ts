import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { SessionService } from '../../core/session/services/session.service';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class LoginPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  protected readonly sessionService = inject(SessionService);
  protected readonly loginForm = this.formBuilder.nonNullable.group({
    username: ['', [Validators.required, Validators.maxLength(80)]],
    password: ['', [Validators.required, Validators.maxLength(512)]],
  });

  protected submit(): void {
    this.loginForm.markAllAsTouched();

    if (this.loginForm.invalid || this.sessionService.authenticating())
      return;

    const { username, password } = this.loginForm.getRawValue();

    this.sessionService.login(username, password);
  }
}
