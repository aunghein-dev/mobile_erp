import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { brandImages } from "@/shared/assets/branding/images";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { api } from "@/shared/lib/api/client";
import { queryKeys } from "@/shared/lib/api/queryKeys";
import { routes } from "@/shared/lib/api/routes";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { useBusinessStore } from "@/shared/store/useBusinessStore";
import { useCurrencyStore } from "@/shared/store/useCurrencyStore";
import { useOfflineUserStore } from "@/shared/store/useOfflineUserStore";
import { useStorageStore, type StorageInfo } from "@/shared/store/useStorageStore";
import type { BusinessInfo, Shop } from "@/shared/types/business";
import type { OfflineUser } from "@/shared/types/user";

type AppBootstrapProps = {
  children: React.ReactNode;
};

type BootPhase = "hydrate" | "prefetch" | "ready";

const MIN_BOOT_MS = 1000;

function hasHydratedStores() {
  return Boolean(
    useAuthStore.persist.hasHydrated() &&
      useBusinessStore.persist.hasHydrated() &&
      useOfflineUserStore.persist.hasHydrated() &&
      useCurrencyStore.persist.hasHydrated() &&
      useStorageStore.persist.hasHydrated()
  );
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchBusiness(queryClient: QueryClient) {
  try {
    return await queryClient.fetchQuery({
      queryKey: queryKeys.info,
      queryFn: async () => {
        const response = await api.get<BusinessInfo>(routes.business.infoMe, {
          withCredentials: true,
        });
        return response.data;
      },
    });
  } catch {
    return null;
  }
}

async function fetchUser(queryClient: QueryClient) {
  try {
    return await queryClient.fetchQuery({
      queryKey: queryKeys.user,
      queryFn: async () => {
        const response = await api.get<OfflineUser>(routes.business.infoMeAccount, {
          withCredentials: true,
        });
        return response.data;
      },
    });
  } catch {
    return null;
  }
}

async function prefetchShops(queryClient: QueryClient, bizId: number) {
  await queryClient.prefetchQuery({
    queryKey: queryKeys.shops(bizId),
    queryFn: async () => {
      const response = await api.get<Shop[]>(routes.business.shopsAll(bizId), {
        withCredentials: true,
      });
      return response.data ?? [];
    },
  });
}

async function fetchStorageInfo(bizId: number) {
  const response = await api.get<StorageInfo>(routes.billing.storage(bizId), {
    withCredentials: true,
  });
  return response.data;
}

async function prefetchBootstrapData(params: {
  queryClient: QueryClient;
  persistedBizId: number | null;
}) {
  const { queryClient, persistedBizId } = params;
  const setBusiness = useBusinessStore.getState().setBusiness;
  const setUser = useOfflineUserStore.getState().setUser;
  const setStorage = useStorageStore.getState().setStorage;
  const fetchCurrency = useCurrencyStore.getState().fetchCurrency;

  const [business, user] = await Promise.all([fetchBusiness(queryClient), fetchUser(queryClient)]);

  if (business?.businessId) {
    setBusiness(business.businessId, business.businessName ?? null);
  }

  if (user) {
    setUser(user);
  }

  const bizId = business?.businessId ?? persistedBizId ?? null;
  if (!bizId) return;

  await Promise.allSettled([
    prefetchShops(queryClient, bizId),
    fetchCurrency(bizId, { preferDefaultBase: true }),
    fetchStorageInfo(bizId).then((storage) => {
      setStorage(storage);
    }),
  ]);
}

function BootSplash({ phase }: { phase: BootPhase }) {
  const theme = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const appName = Constants.expoConfig?.name ?? "Openware ERP";
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const phaseTextMap: Record<BootPhase, string> = {
    hydrate: "Loading app state",
    prefetch: "Syncing startup data",
    ready: "Launching workspace",
  };
  const phaseDescriptionMap: Record<BootPhase, string> = {
    hydrate: "Preparing secure session and local preferences",
    prefetch: "Pulling latest business, currency, and stock context",
    ready: "Finalizing interface and startup checks",
  };
  const phaseProgressMap: Record<BootPhase, number> = {
    hydrate: 0.36,
    prefetch: 0.74,
    ready: 1,
  };
  const phaseOrder: BootPhase[] = ["hydrate", "prefetch", "ready"];
  const activeStepIndex = Math.max(0, phaseOrder.indexOf(phase));
  const phaseText = phaseTextMap[phase];
  const phaseDescription = phaseDescriptionMap[phase];
  const progressPercent = Math.round((phaseProgressMap[phase] ?? 0.2) * 100);

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 860,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 860,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1240,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    pulseLoop.start();
    spinLoop.start();

    return () => {
      pulseLoop.stop();
      spinLoop.stop();
    };
  }, [pulse, spin]);

  const logoScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });
  const spinnerRotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={["#EAF2FA", "#F6FAFF", "#EAF4FA"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.ambientWrap}>
          <View style={[styles.ambientBlobA, { backgroundColor: `${theme.primary}12` }]} />
          <View style={[styles.ambientBlobB, { backgroundColor: `${theme.accent}16` }]} />
        </View>

        <View style={[styles.card, { borderColor: `${theme.primary}26`, backgroundColor: "#FFFFFF" }]}>
          <View style={styles.brandRow}>
            <View style={[styles.logoShell, { borderColor: `${theme.primary}24`, backgroundColor: `${theme.primary}0C` }]}>
              <Animated.View style={{ transform: [{ scale: logoScale }] }}>
                <Image source={brandImages.appLogo || brandImages.logo} style={styles.logo} resizeMode="contain" />
              </Animated.View>
            </View>

            <View style={styles.brandTextWrap}>
              <Text style={[styles.appName, { color: theme.text }]}>{appName}</Text>
              <Text style={[styles.brandSubtext, { color: theme.muted }]}>Retail workspace sync</Text>
            </View>

            <View style={[styles.versionChip, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}>
              <Text style={[styles.versionChipText, { color: theme.text }]}>v{appVersion}</Text>
            </View>
          </View>

          <View style={[styles.phaseCard, { borderColor: `${theme.primary}2A`, backgroundColor: `${theme.primary}06` }]}>
            <View style={styles.phaseHeaderRow}>
              <View style={styles.phaseHeaderTextWrap}>
                <Text style={[styles.phaseTitle, { color: theme.text }]}>{phaseText}</Text>
                <Text style={[styles.phaseCaption, { color: theme.muted }]}>{phaseDescription}</Text>
              </View>

              <Animated.View
                style={[
                  styles.spinner,
                  {
                    borderColor: `${theme.primary}2A`,
                    borderTopColor: theme.primary,
                    transform: [{ rotate: spinnerRotate }],
                  },
                ]}
              />
            </View>

            <View style={[styles.progressTrack, { backgroundColor: `${theme.primary}14` }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: theme.primary,
                    width: `${progressPercent}%`,
                  },
                ]}
              />
            </View>

            <View style={styles.stepRow}>
              {phaseOrder.map((entry, index) => {
                const isCompleted = index < activeStepIndex;
                const isActive = index === activeStepIndex;
                const label = phaseTextMap[entry];

                return (
                  <View
                    key={entry}
                    style={[
                      styles.stepChip,
                      {
                        borderColor: isActive || isCompleted ? `${theme.primary}46` : theme.border,
                        backgroundColor: isActive ? `${theme.primary}16` : isCompleted ? `${theme.primary}0D` : theme.card,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.stepDot,
                        { backgroundColor: isActive || isCompleted ? theme.primary : `${theme.muted}8A` },
                      ]}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.stepText,
                        { color: isActive ? theme.text : isCompleted ? theme.text : theme.muted },
                      ]}
                    >
                      {label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.footerRow}>
            <View style={[styles.footerBadge, { borderColor: `${theme.success}45`, backgroundColor: `${theme.success}16` }]}>
              <Text style={[styles.footerBadgeText, { color: theme.success }]}>Secure session</Text>
            </View>
            <Text style={[styles.footerMeta, { color: theme.muted }]}>{progressPercent}% complete</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

export function AppBootstrap({ children }: AppBootstrapProps) {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const persistedBizId = useBusinessStore((s) => s.bizId);

  const [phase, setPhase] = useState<BootPhase>("hydrate");
  const [storesHydrated, setStoresHydrated] = useState(hasHydratedStores);
  const [bootReady, setBootReady] = useState(false);

  useEffect(() => {
    if (storesHydrated) return;

    const syncHydration = () => {
      if (hasHydratedStores()) {
        setStoresHydrated(true);
      }
    };

    syncHydration();
    const unsubscribers = [
      useAuthStore.persist.onFinishHydration(syncHydration),
      useBusinessStore.persist.onFinishHydration(syncHydration),
      useOfflineUserStore.persist.onFinishHydration(syncHydration),
      useCurrencyStore.persist.onFinishHydration(syncHydration),
      useStorageStore.persist.onFinishHydration(syncHydration),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => {
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }
      });
    };
  }, [storesHydrated]);

  useEffect(() => {
    if (!storesHydrated || bootReady) return;

    let active = true;
    const run = async () => {
      const start = Date.now();
      setPhase("prefetch");

      if (isAuthenticated) {
        await prefetchBootstrapData({
          queryClient,
          persistedBizId,
        });
      }

      const elapsed = Date.now() - start;
      if (elapsed < MIN_BOOT_MS) {
        await sleep(MIN_BOOT_MS - elapsed);
      }

      if (active) {
        setPhase("ready");
        setBootReady(true);
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [storesHydrated, bootReady, isAuthenticated, persistedBizId, queryClient]);

  const isVisible = useMemo(
    () => !storesHydrated || !bootReady || phase !== "ready",
    [storesHydrated, bootReady, phase]
  );

  if (isVisible) {
    return <BootSplash phase={phase} />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  ambientWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  ambientBlobA: {
    position: "absolute",
    top: "13%",
    right: -44,
    width: 190,
    height: 190,
    borderRadius: 999,
  },
  ambientBlobB: {
    position: "absolute",
    bottom: "8%",
    left: -62,
    width: 176,
    height: 176,
    borderRadius: 999,
  },
  card: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    shadowColor: "#102033",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoShell: {
    width: 66,
    height: 66,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 46,
    height: 46,
    borderRadius: 12,
  },
  brandTextWrap: {
    flex: 1,
  },
  appName: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  brandSubtext: {
    marginTop: 1,
    fontSize: 11,
    fontWeight: "600",
  },
  versionChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  versionChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  phaseCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  phaseHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  phaseHeaderTextWrap: {
    flex: 1,
  },
  spinner: {
    width: 24,
    height: 24,
    borderWidth: 3,
    borderColor: "#D8E2ED",
    borderRadius: 999,
  },
  phaseTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  phaseCaption: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 15,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  stepRow: {
    flexDirection: "row",
    gap: 6,
  },
  stepChip: {
    flex: 1,
    minHeight: 30,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  stepText: {
    flex: 1,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  footerBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  footerBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  footerMeta: {
    fontSize: 10,
    fontWeight: "700",
  },
});
