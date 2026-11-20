import { Injectable } from '@nestjs/common';

export type SorobanRailHealth =
  | { status: 'disabled' }
  | { status: 'up' }
  | { status: 'down'; detail: string };

@Injectable()
export class SorobanRailStatus {
  private health: SorobanRailHealth = { status: 'disabled' };

  markReady(): void {
    this.health = { status: 'up' };
  }

  markDisabled(): void {
    this.health = { status: 'disabled' };
  }

  markUnavailable(detail: string): void {
    this.health = { status: 'down', detail };
  }

  getHealth(): SorobanRailHealth {
    return { ...this.health };
  }
}
