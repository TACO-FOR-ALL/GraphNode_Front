// electron/preload/bridges/index.ts
import exposeKeytarBridge from "./keytarBridge";
import exposeSystemBridge from "./systemBridge";
import exposeOpenAIBridge from "./openaiBridge";
import exposeWindowBridge from "./window";

export function exposeAllBridges() {
  exposeKeytarBridge();
  exposeSystemBridge();
  exposeOpenAIBridge();
  exposeWindowBridge();
}
