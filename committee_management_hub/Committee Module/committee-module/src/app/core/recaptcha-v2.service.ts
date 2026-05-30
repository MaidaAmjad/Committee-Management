import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

declare global {
  interface Window {
    grecaptcha?: {
      render: (
        container: HTMLElement,
        parameters: { sitekey: string; callback?: () => void; 'expired-callback'?: () => void }
      ) => number;
      getResponse: (widgetId?: number) => string;
      reset: (widgetId?: number) => void;
    };
    ___recaptchaOnload?: () => void;
  }
}

/** Google reCAPTCHA v2 checkbox for signup / login (verified on the API). */
@Injectable({ providedIn: 'root' })
export class RecaptchaV2Service {
  private widgetId: number | null = null;
  private scriptPromise: Promise<void> | null = null;
  private solved = false;

  isEnabled(): boolean {
    return Boolean(environment.recaptchaSiteKey?.trim());
  }

  get isSolved(): boolean {
    return !this.isEnabled() || this.solved;
  }

  private loadScript(): Promise<void> {
    if (!this.isEnabled()) return Promise.resolve();
    if (window.grecaptcha?.render) return Promise.resolve();
    if (this.scriptPromise) return this.scriptPromise;

    this.scriptPromise = new Promise<void>((resolve, reject) => {
      window.___recaptchaOnload = () => resolve();
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js?onload=___recaptchaOnload&render=explicit';
      script.async = true;
      script.defer = true;
      script.onerror = () => reject(new Error('Could not load security check. Check your connection.'));
      document.head.appendChild(script);
    });

    return this.scriptPromise;
  }

  async render(container: HTMLElement): Promise<void> {
    if (!this.isEnabled()) return;

    await this.loadScript();
    if (!window.grecaptcha) {
      throw new Error('Security check failed to load. Refresh the page and try again.');
    }

    if (container.childElementCount > 0) {
      container.replaceChildren();
    }

    this.solved = false;
    this.widgetId = window.grecaptcha.render(container, {
      sitekey: environment.recaptchaSiteKey,
      callback: () => {
        this.solved = true;
      },
      'expired-callback': () => {
        this.solved = false;
      },
    });
  }

  getResponse(): string {
    if (!this.isEnabled()) return 'dev-bypass';
    if (this.widgetId === null) return '';
    return window.grecaptcha?.getResponse(this.widgetId) || '';
  }

  reset(): void {
    this.solved = false;
    if (this.widgetId !== null && window.grecaptcha) {
      window.grecaptcha.reset(this.widgetId);
    }
  }

  clear(): void {
    this.reset();
    this.widgetId = null;
  }
}
