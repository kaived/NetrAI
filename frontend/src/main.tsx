import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { EyeSplashLoader } from "./components/EyeSplashLoader";
import "./styles.css";
import { registerServiceWorker } from "./pwa/registerServiceWorker";

function Root() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash ? (
        <EyeSplashLoader onFinished={() => setShowSplash(false)} />
      ) : null}
      <div
        className={showSplash ? "opacity-0 pointer-events-none" : "opacity-100 transition-opacity duration-500"}
        aria-hidden={showSplash}
      >
        <App />
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);

registerServiceWorker();
