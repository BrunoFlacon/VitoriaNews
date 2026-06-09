import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message || event.reason || '';
  const msgStr = typeof msg === 'string' ? msg : '';
  if (
    msgStr.includes('dynamically imported module') ||
    msgStr.includes('Loading chunk') ||
    msgStr.includes('ChunkLoadError') ||
    msgStr.includes('Failed to fetch') ||
    msgStr.includes('signal is aborted') ||
    msgStr.includes('AuthRetryableFetchError')
  ) {
    event.preventDefault();
    if (msgStr.includes('dynamically imported module') || msgStr.includes('Loading chunk') || msgStr.includes('ChunkLoadError')) {
      window.location.reload();
    }
    return;
  }
  console.error('Unhandled rejection:', event.reason);
});

window.addEventListener('vite:preloadError', (event: Event) => {
  (event as CustomEvent).preventDefault?.();
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(<App />);
