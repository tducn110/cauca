import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { AppErrorBoundary } from "./app/components/AppErrorBoundary";
import { installGlobalRuntimeErrorHandlers } from "./app/observability/runtimeErrors";
import "./styles/index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Missing required root element: <div id="root"></div>.');
}

installGlobalRuntimeErrorHandlers();

createRoot(rootElement).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
);
