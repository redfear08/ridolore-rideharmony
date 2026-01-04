import { useState, useEffect, useRef, useCallback } from "react";
import { Platform, AppState, AppStateStatus } from "react-native";
import { Accelerometer } from "expo-sensors";
import * as Battery from "expo-battery";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

const CRASH_THRESHOLD = 4.0;
const CRASH_COOLDOWN_MS = 30000;
const STATIONARY_THRESHOLD_MS = 300000;
const LOW_BATTERY_THRESHOLD = 0.15;
const CRITICAL_BATTERY_THRESHOLD = 0.05;

export interface CrashEvent {
  timestamp: Date;
  magnitude: number;
  latitude?: number;
  longitude?: number;
}

export function useCrashDetection(
  enabled: boolean,
  onCrashDetected: (event: CrashEvent) => void,
  userLocation?: { latitude: number; longitude: number } | null
) {
  const lastCrashTime = useRef<number>(0);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    if (!enabled || Platform.OS === "web") {
      setIsMonitoring(false);
      return;
    }

    let subscription: { remove: () => void } | null = null;

    const startMonitoring = async () => {
      try {
        const available = await Accelerometer.isAvailableAsync();
        if (!available) {
          console.log("Accelerometer not available");
          return;
        }

        Accelerometer.setUpdateInterval(100);
        
        subscription = Accelerometer.addListener((data: { x: number; y: number; z: number }) => {
          const magnitude = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
          
          const now = Date.now();
          if (magnitude > CRASH_THRESHOLD && now - lastCrashTime.current > CRASH_COOLDOWN_MS) {
            lastCrashTime.current = now;
            onCrashDetected({
              timestamp: new Date(),
              magnitude,
              latitude: userLocation?.latitude,
              longitude: userLocation?.longitude,
            });
          }
        });

        setIsMonitoring(true);
      } catch (error) {
        console.log("Error starting crash detection:", error);
      }
    };

    startMonitoring();

    return () => {
      if (subscription) {
        subscription.remove();
      }
      setIsMonitoring(false);
    };
  }, [enabled, onCrashDetected, userLocation]);

  return { isMonitoring };
}

export interface BatteryState {
  level: number;
  isCharging: boolean;
  isLow: boolean;
  isCritical: boolean;
}

export function useBatteryMonitor(
  enabled: boolean,
  onLowBattery?: (level: number) => void,
  onCriticalBattery?: (level: number) => void
) {
  const [battery, setBattery] = useState<BatteryState>({
    level: 1,
    isCharging: false,
    isLow: false,
    isCritical: false,
  });
  const hasNotifiedLow = useRef(false);
  const hasNotifiedCritical = useRef(false);

  useEffect(() => {
    if (!enabled || Platform.OS === "web") {
      return;
    }

    let batterySubscription: { remove: () => void } | null = null;
    let stateSubscription: { remove: () => void } | null = null;

    const initBattery = async () => {
      try {
        const level = await Battery.getBatteryLevelAsync();
        const state = await Battery.getBatteryStateAsync();
        const isCharging = state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL;
        
        setBattery({
          level,
          isCharging,
          isLow: level <= LOW_BATTERY_THRESHOLD,
          isCritical: level <= CRITICAL_BATTERY_THRESHOLD,
        });

        batterySubscription = Battery.addBatteryLevelListener(({ batteryLevel }: { batteryLevel: number }) => {
          const isLow = batteryLevel <= LOW_BATTERY_THRESHOLD;
          const isCritical = batteryLevel <= CRITICAL_BATTERY_THRESHOLD;

          setBattery((prev) => ({
            ...prev,
            level: batteryLevel,
            isLow,
            isCritical,
          }));

          if (isLow && !hasNotifiedLow.current && onLowBattery) {
            hasNotifiedLow.current = true;
            onLowBattery(batteryLevel);
          }

          if (isCritical && !hasNotifiedCritical.current && onCriticalBattery) {
            hasNotifiedCritical.current = true;
            onCriticalBattery(batteryLevel);
          }

          if (batteryLevel > LOW_BATTERY_THRESHOLD) {
            hasNotifiedLow.current = false;
          }
          if (batteryLevel > CRITICAL_BATTERY_THRESHOLD) {
            hasNotifiedCritical.current = false;
          }
        });

        stateSubscription = Battery.addBatteryStateListener(({ batteryState }: { batteryState: Battery.BatteryState }) => {
          const isCharging = batteryState === Battery.BatteryState.CHARGING || batteryState === Battery.BatteryState.FULL;
          setBattery((prev) => ({ ...prev, isCharging }));
        });
      } catch (error) {
        console.log("Battery monitoring not available:", error);
      }
    };

    initBattery();

    return () => {
      batterySubscription?.remove();
      stateSubscription?.remove();
    };
  }, [enabled, onLowBattery, onCriticalBattery]);

  return battery;
}

export interface NetworkState {
  isConnected: boolean;
  type: string | null;
  isInternetReachable: boolean | null;
  lastSyncTime: Date | null;
}

export function useNetworkMonitor(
  enabled: boolean,
  onDisconnect?: () => void,
  onReconnect?: () => void
) {
  const [network, setNetwork] = useState<NetworkState>({
    isConnected: true,
    type: null,
    isInternetReachable: true,
    lastSyncTime: null,
  });
  const wasConnected = useRef(true);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleNetworkChange = (state: NetInfoState) => {
      const isConnected = state.isConnected ?? false;
      
      setNetwork({
        isConnected,
        type: state.type,
        isInternetReachable: state.isInternetReachable,
        lastSyncTime: isConnected ? new Date() : network.lastSyncTime,
      });

      if (wasConnected.current && !isConnected && onDisconnect) {
        onDisconnect();
      } else if (!wasConnected.current && isConnected && onReconnect) {
        onReconnect();
      }

      wasConnected.current = isConnected;
    };

    const unsubscribe = NetInfo.addEventListener(handleNetworkChange);

    NetInfo.fetch().then(handleNetworkChange);

    return () => {
      unsubscribe();
    };
  }, [enabled, onDisconnect, onReconnect]);

  const updateLastSync = useCallback(() => {
    setNetwork((prev) => ({ ...prev, lastSyncTime: new Date() }));
  }, []);

  return { ...network, updateLastSync };
}

export interface StationaryState {
  isStationary: boolean;
  stationarySinceMs: number;
  lastMovementTime: Date | null;
}

export function useStationaryDetection(
  enabled: boolean,
  speed: number | null,
  thresholdMs: number = STATIONARY_THRESHOLD_MS,
  onStationaryTooLong?: () => void
) {
  const [stationary, setStationary] = useState<StationaryState>({
    isStationary: false,
    stationarySinceMs: 0,
    lastMovementTime: null,
  });
  const stationaryStartTime = useRef<number | null>(null);
  const hasNotified = useRef(false);

  useEffect(() => {
    if (!enabled) {
      stationaryStartTime.current = null;
      hasNotified.current = false;
      setStationary({
        isStationary: false,
        stationarySinceMs: 0,
        lastMovementTime: null,
      });
      return;
    }

    const speedKmh = (speed || 0) * 3.6;
    const isMoving = speedKmh > 2;
    const now = Date.now();

    if (isMoving) {
      stationaryStartTime.current = null;
      hasNotified.current = false;
      setStationary({
        isStationary: false,
        stationarySinceMs: 0,
        lastMovementTime: new Date(),
      });
    } else {
      if (stationaryStartTime.current === null) {
        stationaryStartTime.current = now;
      }

      const stationarySinceMs = now - stationaryStartTime.current;
      const isStationary = stationarySinceMs > 10000;

      setStationary((prev) => ({
        isStationary,
        stationarySinceMs,
        lastMovementTime: prev.lastMovementTime,
      }));

      if (stationarySinceMs >= thresholdMs && !hasNotified.current && onStationaryTooLong) {
        hasNotified.current = true;
        onStationaryTooLong();
      }
    }
  }, [enabled, speed, thresholdMs, onStationaryTooLong]);

  return stationary;
}
