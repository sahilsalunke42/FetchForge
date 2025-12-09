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
