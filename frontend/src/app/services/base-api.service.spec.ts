// This code is a unit test file. It's used to verify that BaseApiService works correctly

import '@angular/compiler';
import { HttpHeaders } from '@angular/common/http';
import {
    HttpBackend,
    HttpClient,
    HttpEvent,
    HttpRequest,
    HttpResponse
} from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { BaseApiService } from './base-api.service';

// Unit tests should run quickly and in complete isolation without needing an actual backend server running. This is a mock backend
class RecordingHttpBackend implements HttpBackend {
    request?: HttpRequest<unknown>;

    // Acts like a fake interceptor. 
    // When BaseApiService tries to send a request, this backend records it and returns a fake succesful response
    handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
        this.request = request;
        return of(new HttpResponse({ body: { count: 1 } }));
    }
}

describe('BaseApiService', () => {
    let api: BaseApiService;
    let backend: RecordingHttpBackend;

    // Test setup
    beforeEach(() => {
        backend = new RecordingHttpBackend();
        api = new BaseApiService(new HttpClient(backend));
    });

    // Tests cases
    
    it('builds API URLs and supports query strings', () => {
        api.get<{ count: number }>('/users/?page=2').subscribe((response) => {
            expect(response.count).toBe(1);
        });

        expect(backend.request?.urlWithParams).toBe(
            'http://127.0.0.1:8000/api/users/?page=2'
        );
        expect(backend.request?.method).toBe('GET');
    });

    it('forwards headers to API requests', () => {
        const headers = new HttpHeaders({ Authorization: 'Bearer access-token' });

        api.post('users/logout/', {}, { headers }).subscribe();

        expect(backend.request?.urlWithParams).toBe(
            'http://127.0.0.1:8000/api/users/logout/'
        );
        expect(backend.request?.method).toBe('POST');
        expect(backend.request?.headers.get('Authorization')).toBe(
            'Bearer access-token'
        );
    });

    it('supports PUT, PATCH, and DELETE requests', () => {
        api.put('users/1/', {}).subscribe();
        expect(backend.request?.method).toBe('PUT');

        api.patch('users/1/', {}).subscribe();
        expect(backend.request?.method).toBe('PATCH');

        api.delete('users/1/').subscribe();
        expect(backend.request?.method).toBe('DELETE');
    });
});
