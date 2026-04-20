import { exposeAllBridges } from "./bridges";
import { initPreloadSentry } from "./sentry";

initPreloadSentry();
exposeAllBridges();
