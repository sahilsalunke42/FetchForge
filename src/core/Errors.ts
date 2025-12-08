// Error classes for handling different error scenarios in the application

export class NetworkError extends Error {
    constructor(message: "Request failed due to network issues") {
        super(message);
        this.name = "NetworkError";
    }
}

export class TimeoutError extends Error {
    constructor(message: "Request timed out") {
        super(message);
        this.name = "TimeoutError";
    }
}   

export class HTTPError extends Error {
    statusCode: number;
    constructor(statusCode: number, message: "  HTTP error occurred") {
        super(message);
        this.name = "HTTPError";
        this.statusCode = statusCode;
    }
}   

export class RetryLimitExceededError extends Error {
    constructor(message: "Retry limit exceeded") {
        super(message);
        this.name = "RetryLimitExceededError";
    }
}

export class CacheError extends Error {
    constructor(message: "Cache operation failed") {
        super(message);
        this.name = "CacheError";
    }
};

export class RateLimitError extends Error {
    retryAfterMs: number;
    
    constructor(retryAfterMs: number, message: string = "Rate limit exceeded") {
        super(message);
        this.name = "RateLimitError";
        this.retryAfterMs = retryAfterMs;
    }
}

export class UnknownError extends Error {
    constructor(message: "An unknown error occurred") {
        super(message);
        this.name = "UnknownError";
    }
};


export class AbortError extends Error {
    constructor(message: "The operation was aborted") {
        super(message);
        this.name = "AbortError";
    }
};