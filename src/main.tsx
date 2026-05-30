import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message || event.reason || '';
  if (
    typeof msg === 'string' && (
      msg.includes('dynamically imported module') ||
      msg.includes('Loading chunk') ||
      msg.includes('ChunkLoadError') ||
      msg.includes('Failed to fetch')
    )
  ) {
    event.preventDefault();
    window.location.reload();
    return;
  }
  console.error('Unhandled rejection:', event.reason);
});

window.addEventListener('vite:preloadError', (event: Event) => {
  (event as CustomEvent).preventDefault?.();
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(<App />);
