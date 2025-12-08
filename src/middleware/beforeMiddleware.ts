// beforeMiddleware.ts defines the interface and handling logic for request-side middleware that runs before the HttpClient sends a request. Each middleware is a function (req) => req or (req) => Promise<req> that can modify the request by adding headers, injecting authentication tokens, signing the request, logging metadata, rewriting URLs, or applying default configuration. The HttpClient holds a list of these functions, added via useBefore(), and at runtime it executes them sequentially in a pipeline: the output of one becomes the input of the next. If any middleware throws an error, the entire request chain stops immediately and the HttpClient rejects the request before it hits the network. This design ensures that all transformations, validation, and request preparation logic stays modular and can be cleanly layered without touching the core HttpClient implementation.

import { ClientRequest } from "../client/request";



export type BeforeMiddleware = (req: ClientRequest) => Promise<ClientRequest> | ClientRequest;

export async function runBeforeMiddlewares(
  req: ClientRequest,
  middlewares: BeforeMiddleware[]
): Promise<ClientRequest> {
  let modifiedReq = req;
  for (const mw of middlewares) {
    modifiedReq = await mw(modifiedReq);
  }
  return modifiedReq;
}   
