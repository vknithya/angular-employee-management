import { Injectable } from '@angular/core';
import { createSeedData, DbState } from './seed-data';

const STORAGE_KEY = 'ems.mock-db.v1';

/**
 * The mock backend's "database": a plain object persisted to localStorage so
 * data survives page reloads. Only the mock API should touch this.
 */
@Injectable({ providedIn: 'root' })
export class MockDb {
  private state: DbState = this.load();

  get data(): DbState {
    return this.state;
  }

  commit(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Storage may be full or unavailable (private mode); data stays in memory.
    }
  }

  reset(): void {
    this.state = createSeedData();
    this.commit();
  }

  private load(): DbState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored) as DbState;
    } catch {
      // Corrupt or inaccessible storage falls through to a fresh seed.
    }
    const seed = createSeedData();
    this.state = seed;
    this.commit();
    return seed;
  }
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
