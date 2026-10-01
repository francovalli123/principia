import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            switch (error.status) {
                //401 Unauthorized is handled by the authInterceptor, so we can ignore it here
                case 400:
                    // Handle bad request error (e.g., show a message)
                    console.error('Bad request - please check your input.');
                    break;
                case 403:
                    // Handle forbidden error (e.g., show a message)
                    console.error('Access forbidden - you do not have permission.');
                    break;
                case 404:
                    // Handle not found error (e.g., show a message)
                    console.error('Resource not found.');
                    break;
                case 500:
                    // Handle internal server error (e.g., show a message)
                    console.error('Internal server error - please try again later.');
                    break;
                default:
                    // Handle other errors
                    console.error(`An unexpected error occurred: ${error.message}`);
            }
            return throwError(() => error);
        })
    );
}