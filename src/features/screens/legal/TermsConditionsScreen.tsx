import React from "react";
import { StyleSheet, Text } from "react-native";
import { Screen } from "@/shared/components/layout/Screen";
import { SectionTitle } from "@/shared/components/ui/SectionTitle";
import { Card } from "@/shared/components/ui/Card";
import { termsText } from "@/shared/assets/legal/text";

export default function TermsConditionsScreen() {
  return (
    <Screen>
      <SectionTitle title="Terms and Conditions" subtitle="Openware Mobile" />
      <Card>
        <Text style={styles.bodyText}>{termsText.trim()}</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bodyText: {
    fontSize: 12,
    lineHeight: 20,
  },
});
