import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, TitleStrategy, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { AppTitleStrategy } from './core/app-title.strategy';
import { authTokenInterceptor, errorInterceptor, loadingInterceptor } from './core/http/interceptors';
import { mockBackendInterceptor } from './core/mock-api/mock-backend.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' })
    ),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    provideHttpClient(
      withInterceptors([
        loadingInterceptor,
        authTokenInterceptor,
        errorInterceptor,
        // Must stay last: it answers requests instead of forwarding them.
        mockBackendInterceptor
      ])
    )
  ]
};
