import { ContactMessageSummary } from './contact-message-summary.model';

export interface ContactMessageDetail extends ContactMessageSummary {
  readonly schemaVersion: 1;
  readonly phone: string;
  readonly message: string;
  readonly source: 'website';
  readonly requestId: string;
  readonly turnstileHostname: string;
}
