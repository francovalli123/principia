import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

import { authInterceptor } from './services/auth-interceptor';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { errorInterceptor } from  './services/error-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))
  ]
};
