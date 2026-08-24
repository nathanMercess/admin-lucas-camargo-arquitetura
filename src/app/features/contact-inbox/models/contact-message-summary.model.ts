import { ContactMessageStatus } from './contact-message-status.type';

export interface ContactMessageSummary {
  readonly id: string;
  readonly receivedAt: string;
  readonly status: ContactMessageStatus;
  readonly name: string;
  readonly email: string;
  readonly subject: string;
}
