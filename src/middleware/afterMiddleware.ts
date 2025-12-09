
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