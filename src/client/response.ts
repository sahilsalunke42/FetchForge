// This defines what a response looks like on the client side. This contains status code, headers, and body, parsed as JSON or text, time taken and URL/method for debugging

export interface ClientResponse<T = any> {
    url: string;
    method: string;
    status: number;
    headers: Record<string, string>;
    body: string | ArrayBuffer | null;
    data?: T;
    durationMs: number;
    ok: boolean;
};
export class ClientResponseImpl<T = any> implements ClientResponse<T> {
    url: string;
    method: string;
    status: number;
    headers: Record<string, string>;
    body: string | ArrayBuffer | null;
    data?: T;
    durationMs: number;
    ok: boolean;
    constructor(params: ClientResponse<T>) {
        this.url = params.url;
        this.method = params.method;
        this.status = params.status;
        this.ok = this.status >= 200 && this.status < 300;
        this.headers = params.headers;
        this.body = params.body;
        this.data = params.data;
        this.durationMs = params.durationMs;
    };   
};