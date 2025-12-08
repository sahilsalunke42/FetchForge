// middleware/index.ts acts as the central export hub that bundles together middleware types, factories, and registration functions. It exports the BeforeMiddleware and AfterMiddleware types, helper utilities for creating middleware functions, and potentially predefined middleware such as logging middleware, auth middleware, JSON parsing middleware, or retry-decision middleware. This file enables consumers of your SDK to import middleware primitives directly from one place (import { useBefore, useAfter } from "…/middleware") instead of importing each middleware file individually. It also keeps the HttpClient decoupled from middleware implementations by only depending on the types defined here, ensuring a clean separation of layers and making the SDK’s middleware ecosystem extensible and modular.

export type { BeforeMiddleware } from "./beforeMiddleware";
export { runBeforeMiddlewares } from "./beforeMiddleware";
export type { AfterMiddleware } from "./afterMiddleware";
export { runAfterMiddlewares } from "./afterMiddleware";

