import { Injectable, signal } from '@angular/core';

/** Shared state for mobile drawer navigation. */
@Injectable({ providedIn: 'root' })
export class MobileNavService {
  drawerOpen = signal(false);

  openDrawer(): void {
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  toggleDrawer(): void {
    this.drawerOpen.update(open => !open);
  }
}
