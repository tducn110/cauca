import { useCallback, useEffect, useState } from "react";
import { useAppShell } from "./hooks/useAppShell";
import { GameApp } from "./GameApp";
import { preloadCriticalResources, preloadNonCriticalResources } from "../utils/game-loader";
import { completeGameLoading, onGameLoadingDismiss, setGameLoadingProgress } from "../utils/loading-controller";


export default function App() {
  const [bootstrapReady, setBootstrapReady] = useState(false);
  const [initialSceneSettled, setInitialSceneSettled] = useState(false);

  // The document loader owns boot presentation. It waits for browser resources
  // and the initial Pixi scene, rather than exposing an unfinished stage.
  useEffect(() => {
    setGameLoadingProgress(25);
    const criticalPromise = preloadCriticalResources((pct) => {
      setGameLoadingProgress(Math.min(95, pct));
    });
    const winkPromise = new Promise<void>((resolve) => {
      if (typeof window === "undefined") return resolve();
      let attempts = 0;
      const check = () => {
        if ((window as any).Wink || (window as any).WinkBridge || attempts > 20) resolve();
        else { attempts++; setTimeout(check, 100); }
      };
      check();
    });
    void Promise.allSettled([criticalPromise, winkPromise]).then(() => setBootstrapReady(true));
    const unbind = onGameLoadingDismiss(() => {
      preloadNonCriticalResources();
    });
    return unbind;
  }, []);

  useEffect(() => {
    if (bootstrapReady && initialSceneSettled) completeGameLoading();
  }, [bootstrapReady, initialSceneSettled]);

  useEffect(() => {
    const blockCopyAction = (event: Event) => {
      event.preventDefault();
    };

    document.addEventListener("copy", blockCopyAction, true);
    document.addEventListener("cut", blockCopyAction, true);
    document.addEventListener("selectstart", blockCopyAction, true);
    document.addEventListener("dragstart", blockCopyAction, true);
    document.addEventListener("contextmenu", blockCopyAction, true);

    return () => {
      document.removeEventListener("copy", blockCopyAction, true);
      document.removeEventListener("cut", blockCopyAction, true);
      document.removeEventListener("selectstart", blockCopyAction, true);
      document.removeEventListener("dragstart", blockCopyAction, true);
      document.removeEventListener("contextmenu", blockCopyAction, true);
    };
  }, []);

  const handleInitialSceneSettled = useCallback(() => {
    setInitialSceneSettled(true);
  }, []);

  const shell = useAppShell();
  return <GameApp {...shell} onInitialSceneSettled={handleInitialSceneSettled} />;
}
