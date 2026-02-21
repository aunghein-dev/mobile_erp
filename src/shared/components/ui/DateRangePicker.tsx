import React, { memo, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { AppPressable } from "./AppPressable";
import { AppButton } from "./AppButton";
import { DrawerSheet } from "./DrawerSheet";

type DateRangeValue = {
  startDate: string;
  endDate: string;
};

type DateRangePickerProps = {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  label?: string;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function pad2(value: number) {
  return value.toString().padStart(2, "0");
}

function toIsoDate(value: Date) {
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
}

function parseIsoDate(value: string | null | undefined) {
  const candidate = (value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return null;
  const [yearText, monthText, dayText] = candidate.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function isSameDay(left: Date | null, right: Date | null) {
  if (!left || !right) return false;
  return toIsoDate(left) === toIsoDate(right);
}

function formatDisplayDate(value: string) {
  const date = parseIsoDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function normalizeRange(startDate: string, endDate: string): DateRangeValue {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);

  if (!start && !end) {
    return { startDate: "", endDate: "" };
  }

  if (start && !end) {
    return { startDate: toIsoDate(start), endDate: "" };
  }

  if (!start && end) {
    return { startDate: toIsoDate(end), endDate: "" };
  }

  if ((start as Date).getTime() <= (end as Date).getTime()) {
    return { startDate: toIsoDate(start as Date), endDate: toIsoDate(end as Date) };
  }

  return { startDate: toIsoDate(end as Date), endDate: toIsoDate(start as Date) };
}

function rangeSummary(startDate: string, endDate: string) {
  const normalized = normalizeRange(startDate, endDate);
  if (!normalized.startDate) return "All dates";
  if (!normalized.endDate) return formatDisplayDate(normalized.startDate);
  return `${formatDisplayDate(normalized.startDate)} - ${formatDisplayDate(normalized.endDate)}`;
}

function buildCalendarDays(year: number, month: number) {
  const firstOfMonth = new Date(year, month, 1);
  const start = new Date(firstOfMonth);
  start.setDate(1 - firstOfMonth.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function buildPresetRange(preset: "today" | "last7" | "last30" | "thisMonth"): DateRangeValue {
  const today = new Date();
  const todayIso = toIsoDate(today);

  if (preset === "today") {
    return { startDate: todayIso, endDate: todayIso };
  }

  if (preset === "last7") {
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return { startDate: toIsoDate(start), endDate: todayIso };
  }

  if (preset === "last30") {
    const start = new Date(today);
    start.setDate(today.getDate() - 29);
    return { startDate: toIsoDate(start), endDate: todayIso };
  }

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  return { startDate: toIsoDate(monthStart), endDate: todayIso };
}

function DateRangePickerComponent({ value, onChange, label = "Date range" }: DateRangePickerProps) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const [draftStart, setDraftStart] = useState("");
  const [draftEnd, setDraftEnd] = useState("");
  const [cursorYear, setCursorYear] = useState(new Date().getFullYear());
  const [cursorMonth, setCursorMonth] = useState(new Date().getMonth());

  const normalizedValue = useMemo(
    () => normalizeRange(value.startDate, value.endDate),
    [value.endDate, value.startDate]
  );
  const normalizedDraft = useMemo(
    () => normalizeRange(draftStart, draftEnd),
    [draftEnd, draftStart]
  );
  const selectedStart = parseIsoDate(normalizedDraft.startDate);
  const selectedEnd = parseIsoDate(normalizedDraft.endDate);
  const todayIso = toIsoDate(new Date());

  const calendarDays = useMemo(
    () => buildCalendarDays(cursorYear, cursorMonth),
    [cursorMonth, cursorYear]
  );
  const monthLabel = useMemo(() => {
    const date = new Date(cursorYear, cursorMonth, 1);
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(date);
  }, [cursorMonth, cursorYear]);

  const openPicker = () => {
    const activeStart = parseIsoDate(normalizedValue.startDate);
    const activeEnd = parseIsoDate(normalizedValue.endDate);
    const focusDate = activeStart ?? activeEnd ?? new Date();

    setDraftStart(normalizedValue.startDate);
    setDraftEnd(normalizedValue.endDate);
    setCursorYear(focusDate.getFullYear());
    setCursorMonth(focusDate.getMonth());
    setVisible(true);
  };

  const closePicker = () => {
    setVisible(false);
  };

  const prevMonth = () => {
    if (cursorMonth === 0) {
      setCursorMonth(11);
      setCursorYear((prev) => prev - 1);
      return;
    }
    setCursorMonth((prev) => prev - 1);
  };

  const nextMonth = () => {
    if (cursorMonth === 11) {
      setCursorMonth(0);
      setCursorYear((prev) => prev + 1);
      return;
    }
    setCursorMonth((prev) => prev + 1);
  };

  const onSelectDate = (date: Date) => {
    const currentStart = parseIsoDate(draftStart);
    const currentEnd = parseIsoDate(draftEnd);
    const pickedIso = toIsoDate(date);

    if (!currentStart || currentEnd) {
      setDraftStart(pickedIso);
      setDraftEnd("");
      return;
    }

    if (date.getTime() < currentStart.getTime()) {
      setDraftStart(pickedIso);
      setDraftEnd(toIsoDate(currentStart));
      return;
    }

    setDraftEnd(pickedIso);
  };

  const applyPreset = (preset: "today" | "last7" | "last30" | "thisMonth") => {
    const next = buildPresetRange(preset);
    setDraftStart(next.startDate);
    setDraftEnd(next.endDate);
    const focus = parseIsoDate(next.startDate) ?? new Date();
    setCursorYear(focus.getFullYear());
    setCursorMonth(focus.getMonth());
  };

  const clearDraft = () => {
    setDraftStart("");
    setDraftEnd("");
  };

  const applyRange = () => {
    onChange(normalizedDraft);
    setVisible(false);
  };

  const isPresetActive = (preset: "today" | "last7" | "last30" | "thisMonth") => {
    const presetRange = buildPresetRange(preset);
    return (
      normalizedDraft.startDate === presetRange.startDate &&
      normalizedDraft.endDate === presetRange.endDate
    );
  };
  const hasActiveRange = Boolean(normalizedValue.startDate);

  return (
    <>
      <AppPressable
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Open date range selector"
        style={[
          styles.triggerButton,
          {
            borderColor: hasActiveRange ? `${theme.primary}66` : theme.border,
            backgroundColor: hasActiveRange ? `${theme.primary}0D` : theme.card,
          },
        ]}
      >
        <View style={styles.triggerLeft}>
          <View
            style={[
              styles.triggerIconWrap,
              {
                borderColor: hasActiveRange ? `${theme.primary}33` : theme.border,
                backgroundColor: hasActiveRange ? `${theme.primary}14` : theme.cardSoft,
              },
            ]}
          >
            <MaterialCommunityIcons name="calendar-range" size={15} color={theme.primary} />
          </View>
          <View style={styles.triggerTextWrap}>
            <Text style={[styles.triggerLabel, { color: theme.muted }]}>{label}</Text>
            <Text style={[styles.triggerValue, { color: theme.text }]} numberOfLines={1}>
              {rangeSummary(normalizedValue.startDate, normalizedValue.endDate)}
            </Text>
          </View>
        </View>
        <View style={styles.triggerRight}>
          {hasActiveRange ? (
            <View
              style={[
                styles.activeBadge,
                {
                  borderColor: `${theme.primary}44`,
                  backgroundColor: `${theme.primary}12`,
                },
              ]}
            >
              <Text style={[styles.activeBadgeText, { color: theme.primary }]}>Filtered</Text>
            </View>
          ) : null}
          <MaterialCommunityIcons name="chevron-down" size={16} color={theme.muted} />
        </View>
      </AppPressable>

      <DrawerSheet
        visible={visible}
        onClose={closePicker}
        animationType="fade"
        sheetStyle={[styles.sheet, { borderColor: theme.border }]}
      >
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: theme.text }]}>Date Range</Text>
          <Text style={[styles.sheetSubtitle, { color: theme.muted }]}>
            {rangeSummary(normalizedDraft.startDate, normalizedDraft.endDate)}
          </Text>
        </View>

        <View style={styles.presetRow}>
          {[
            { key: "today", label: "Today" },
            { key: "last7", label: "Last 7D" },
            { key: "last30", label: "Last 30D" },
            { key: "thisMonth", label: "This Month" },
          ].map((preset) => {
            const active = isPresetActive(preset.key as "today" | "last7" | "last30" | "thisMonth");
            return (
              <AppPressable
                key={preset.key}
                onPress={() => applyPreset(preset.key as "today" | "last7" | "last30" | "thisMonth")}
                style={[
                  styles.presetChip,
                  {
                    borderColor: active ? `${theme.primary}66` : theme.border,
                    backgroundColor: active ? `${theme.primary}12` : theme.card,
                  },
                ]}
              >
                <Text style={[styles.presetChipText, { color: active ? theme.primary : theme.text }]}>
                  {preset.label}
                </Text>
              </AppPressable>
            );
          })}
        </View>

        <View style={styles.monthBar}>
          <AppPressable
            onPress={prevMonth}
            style={[styles.monthNavBtn, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}
          >
            <MaterialCommunityIcons name="chevron-left" size={18} color={theme.text} />
          </AppPressable>
          <Text style={[styles.monthLabel, { color: theme.text }]}>{monthLabel}</Text>
          <AppPressable
            onPress={nextMonth}
            style={[styles.monthNavBtn, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}
          >
            <MaterialCommunityIcons name="chevron-right" size={18} color={theme.text} />
          </AppPressable>
        </View>

        <View style={styles.weekRow}>
          {DAY_NAMES.map((day) => (
            <View key={day} style={styles.dayColumn}>
              <Text style={[styles.weekLabel, { color: theme.muted }]}>{day}</Text>
            </View>
          ))}
        </View>

        <View style={styles.grid}>
          {calendarDays.map((day) => {
            const dayIso = toIsoDate(day);
            const isCurrentMonth = day.getMonth() === cursorMonth && day.getFullYear() === cursorYear;
            const isSelectedStart = isSameDay(day, selectedStart);
            const isSelectedEnd = isSameDay(day, selectedEnd);
            const isSelectedEdge = isSelectedStart || isSelectedEnd;
            const isToday = dayIso === todayIso;
            const inRange =
              selectedStart &&
              selectedEnd &&
              day.getTime() >= selectedStart.getTime() &&
              day.getTime() <= selectedEnd.getTime();

            return (
              <View key={dayIso} style={styles.dayColumn}>
                <AppPressable
                  onPress={() => onSelectDate(day)}
                  style={[
                    styles.dayCell,
                    {
                      backgroundColor: isSelectedEdge
                        ? theme.primary
                        : inRange
                          ? `${theme.primary}12`
                          : "transparent",
                      borderColor: isSelectedEdge
                        ? theme.primary
                        : isToday
                          ? `${theme.primary}66`
                          : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayLabel,
                      {
                        color: isSelectedEdge
                          ? "#FFFFFF"
                          : isCurrentMonth
                            ? theme.text
                            : theme.muted,
                        opacity: isCurrentMonth ? 1 : 0.6,
                      },
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                </AppPressable>
              </View>
            );
          })}
        </View>

        <View style={styles.footerRow}>
          <AppButton label="Clear" variant="secondary" onPress={clearDraft} style={styles.flexBtn} />
          <AppButton label="Cancel" variant="secondary" onPress={closePicker} style={styles.flexBtn} />
          <AppButton label="Apply" onPress={applyRange} style={styles.flexBtn} />
        </View>
      </DrawerSheet>
    </>
  );
}

export const DateRangePicker = memo(DateRangePickerComponent);

const styles = StyleSheet.create({
  triggerButton: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  triggerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flex: 1,
  },
  triggerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    alignItems: "center",
    justifyContent: "center",
  },
  triggerTextWrap: {
    flex: 1,
    gap: 1,
  },
  triggerLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  triggerValue: {
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 14,
  },
  triggerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activeBadge: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activeBadgeText: {
    fontSize: 9,
    fontWeight: "700",
  },
  sheet: {
    maxHeight: "74%",
    gap: 12,
  },
  sheetHeader: {
    gap: 2,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  sheetSubtitle: {
    fontSize: 11,
    fontWeight: "600",
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  presetChip: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  presetChipText: {
    fontSize: 10,
    fontWeight: "700",
  },
  monthBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  monthNavBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "800",
  },
  weekRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dayColumn: {
    width: "14.285714%",
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  weekLabel: {
    width: "100%",
    textAlign: "center",
    fontSize: 10,
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    alignItems: "center",
    justifyContent: "center",
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    includeFontPadding: false,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  flexBtn: {
    flex: 1,
  },
});
