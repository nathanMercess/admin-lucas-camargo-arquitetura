import { DashboardStepState } from './dashboard-step-state.type';

export interface DashboardStep {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly status: string;
  readonly state: DashboardStepState;
}
