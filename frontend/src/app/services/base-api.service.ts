// Centralizes the API URL and provides HTTP methods with support for headers and parameters.
// This pattern avoids code duplication
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

// Defines an optional structure for requests
export interface ApiRequestOptions {
    // It allows you send customized headers or query params in the urls whenever you need it
    headers?: HttpHeaders;
    params?: HttpParams;
}

@Injectable({
    // It registers the service with the root injector making this service a singleton
    providedIn: 'root'
})

export class BaseApiService {
    private readonly baseUrl = 'http://127.0.0.1:8000/api';

    // Injects Angular's native HttpClient module, which is responsible for making requests to the server
    constructor(private readonly http: HttpClient) {}

    // Joins the base URL with the specific path you pass to it (e.g. users)
    getUrl(path: string): string {
        return `${this.baseUrl}/${path.replace(/^\/+/, '')}`;   // Removes duplicate slash if any (e.g. ./api//users)
    }

    // Generic HTTP methods

    get<T>(path: string, options: ApiRequestOptions = {}): Observable<T> {
        return this.http.get<T>(this.getUrl(path), options);
    }

    post<T>(
        path: string,
        body: unknown,
        options: ApiRequestOptions = {}
    ): Observable<T> {  // Angular handles HTTP requests asynchronously using RxJS
        // This method returns a Observable that components can suscribe to recieve data
        return this.http.post<T>(this.getUrl(path), body, options);
    }

    put<T>(
        path: string,
        body: unknown,
        options: ApiRequestOptions = {}
    ): Observable<T> {
        return this.http.put<T>(this.getUrl(path), body, options);
    }

    patch<T>(
        path: string,
        body: unknown,
        options: ApiRequestOptions = {}
    ): Observable<T> {
        return this.http.patch<T>(this.getUrl(path), body, options);
    }

    delete<T>(path: string, options: ApiRequestOptions = {}): Observable<T> {
        return this.http.delete<T>(this.getUrl(path), options);
    }
}
