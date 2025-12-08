// afterMiddleware.ts defines the interface and execution logic for middleware that runs after the HttpClient receives a ClientResponse but before returning it to the user. Each middleware is a function (res) => res or (res) => Promise<res> that can parse data, transform the body (e.g., JSON parsing), attach metadata, convert errors, redact sensitive fields, or perform metrics/logging based on response details. HttpClient invokes these middleware functions sequentially on the response object, allowing each one to modify or wrap the result. If an after-middleware throws an error, HttpClient surfaces that error to the caller, enabling custom post-processing and error shaping. This keeps post-response logic separate and pluggable, while HttpClient stays a clean orchestrator.

import { ClientResponse } from "../client/response";

export type AfterMiddleware = (res: ClientResponse) => Promise<ClientResponse> | ClientResponse;

export async function runAfterMiddlewares(
  res: ClientResponse,
  middlewares: AfterMiddleware[]
): Promise<ClientResponse> {
  let modifiedRes = res;
  for (const mw of middlewares) {
    modifiedRes = await mw(modifiedRes);
  }
  return modifiedRes;
}   