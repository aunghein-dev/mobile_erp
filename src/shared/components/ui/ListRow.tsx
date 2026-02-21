import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppPressable } from "@/shared/components/ui/AppPressable";
import { Card } from "./Card";
import { useTheme } from "@/shared/contexts/ThemeContext";

type ListRowActionTone = "default" | "primary" | "danger";

export type ListRowAction = {
  key: string;
  label: string;
  onPress: () => void;
  tone?: ListRowActionTone;
  disabled?: boolean;
};

type ListRowProps = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  footer?: string;
  actions?: ListRowAction[];
  onPress?: () => void;
};

function ListRowComponent({ title, subtitle, right, footer, actions, onPress }: ListRowProps) {
  const theme = useTheme();
  const actionList = actions ?? [];

  const content = (
    <View style={styles.innerWrap}>
      <View style={styles.top}>
        <View style={styles.leftWrap}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: theme.muted }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {typeof right === "string" ? (
          <Text style={[styles.right, { color: theme.primary }]}>{right}</Text>
        ) : (
          right
        )}
      </View>

      {footer ? <Text style={[styles.footer, { color: theme.muted }]}>{footer}</Text> : null}

      {actionList.length ? (
        <View style={styles.actionsRow}>
          {actionList.map((action) => {
            const tone = action.tone ?? "default";
            const isDanger = tone === "danger";
            const isPrimary = tone === "primary";
            return (
              <AppPressable
                key={action.key}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                accessibilityHint={`${title} action`}
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    borderColor: isDanger ? theme.danger : isPrimary ? theme.primary : theme.border,
                    backgroundColor: isDanger
                      ? `${theme.danger}12`
                      : isPrimary
                        ? `${theme.primary}12`
                        : theme.cardSoft,
                    opacity: action.disabled ? 0.5 : pressed ? 0.82 : 1,
                  },
                ]}
                android_ripple={{ color: `${theme.primary}18` }}
                onPress={action.onPress}
                disabled={action.disabled}
              >
                <Text
                  style={[
                    styles.actionText,
                    {
                      color: isDanger ? theme.danger : isPrimary ? theme.primary : theme.text,
                    },
                  ]}
                >
                  {action.label}
                </Text>
              </AppPressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Card>
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={title}
          accessibilityHint="Open details"
          style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}
          android_ripple={{ color: `${theme.primary}18` }}
          onPress={onPress}
        >
          {content}
        </AppPressable>
      </Card>
    );
  }

  return <Card>{content}</Card>;
}

export const ListRow = memo(ListRowComponent);

const styles = StyleSheet.create({
  innerWrap: {
    gap: 7,
  },
  top: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  leftWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 12,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 10,
  },
  right: {
    fontSize: 11,
    fontWeight: "700",
  },
  footer: {
    fontSize: 9,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  actionBtn: {
    minHeight: 28,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    fontSize: 9,
    fontWeight: "700",
  },
});
