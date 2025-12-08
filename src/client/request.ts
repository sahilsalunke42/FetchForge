// this defines what a request looks like on the client side. This contains URL, mdethod, headers, retry count, timeout and cache configuration

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface CacheConfig {
  enabled: boolean;
  durationMs: number;
}

export interface ClientRequest {
  url: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  retryCount?: number;
  timeoutMs?: number;
  cache?: CacheConfig;
  retry?: {
    retries: number;
  };
}


export class ClientRequestImpl implements ClientRequest {
  url: string;
  method: HttpMethod;
    headers?: Record<string, string>;
    body?: any;
    retryCount?: number;
    timeoutMs?: number;
    cache?: CacheConfig;
    retry?: {
      retries: number;
    };

    constructor(params: ClientRequest) {
        if (!params.url) {
            throw new Error("URL is required for ClientRequest");
        }

        this.url = params.url;  
        this.method = params.method.toUpperCase() as HttpMethod;
        this.headers = params.headers ?? {};
        this.body = params.body;
        this.retryCount = params.retryCount ?? 0;
        this.timeoutMs = params.timeoutMs ?? 5000;
        this.cache = params.cache ?? { enabled: false, durationMs: 0 };
        this.retry = params.retry ?? { retries: 0 };
    }

};