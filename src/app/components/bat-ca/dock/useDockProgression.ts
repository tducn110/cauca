import { useCallback, useEffect, useRef, useState } from "react";
import { loadSave, subscribeToSave, type SaveData } from "../game/storage";
import {
  claimGiftReward,
  claimOfflineEarnings,
  getDockProgression,
  purchaseDockUpgrade,
  type DockUpgradeType,
  type GiftClaimResult,
  type OfflineClaimResult,
  type UpgradePurchaseResult,
} from "./progression";

const CLOCK_TICK_MS = 1_000;
let claimedOfflineThisSession = false;

export type UseDockProgressionOptions = {
  autoClaimOffline?: boolean;
};

export function useDockProgression(options: UseDockProgressionOptions = {}) {
  const { autoClaimOffline = true } = options;
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [now, setNow] = useState(() => Date.now());
  const [lastOfflineClaim, setLastOfflineClaim] = useState<OfflineClaimResult | null>(null);
  const autoClaimAttempted = useRef(false);

  const refresh = useCallback(() => {
    setSave(loadSave());
    setNow(Date.now());
  }, []);

  const claimOffline = useCallback((): OfflineClaimResult => {
    const result = claimOfflineEarnings();
    setLastOfflineClaim(result);
    setSave(result.save);
    setNow(Date.now());
    return result;
  }, []);

  const claimGift = useCallback((): GiftClaimResult => {
    const result = claimGiftReward();
    setSave(result.save);
    setNow(Date.now());
    return result;
  }, []);

  const purchaseUpgrade = useCallback((type: DockUpgradeType): UpgradePurchaseResult => {
    const result = purchaseDockUpgrade(type);
    setSave(result.save);
    setNow(Date.now());
    return result;
  }, []);

  useEffect(() => {
    return subscribeToSave(setSave);
  }, []);

  useEffect(() => {
    if (!autoClaimOffline || autoClaimAttempted.current || claimedOfflineThisSession) return;
    autoClaimAttempted.current = true;
    claimedOfflineThisSession = true;
    claimOffline();
  }, [autoClaimOffline, claimOffline]);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    const handleStorage = () => refresh();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") claimOffline();
    };

    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(clock);
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [claimOffline, refresh]);

  return {
    ...getDockProgression(now, save),
    lastOfflineClaim,
    refresh,
    claimOffline,
    claimGift,
    purchaseUpgrade,
  };
}
