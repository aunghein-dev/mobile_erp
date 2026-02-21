import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  heroCard: {
    gap: 10,
    borderRadius: 10,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  heroTitleWrap: {
    flex: 1,
    gap: 2,
  },
  heroTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  heroSubtitle: {
    fontSize: 10,
    fontWeight: "600",
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  progressTitle: {
    fontSize: 11,
    fontWeight: "700",
  },
  progressValue: {
    fontSize: 11,
    fontWeight: "800",
  },
  progressTrack: {
    width: "100%",
    height: 7,
    borderRadius: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 10,
  },
  stepRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 7,
  },
  stepChip: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  stepChipText: {
    fontSize: 10,
    fontWeight: "700",
  },
  heroChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 10,
    fontWeight: "700",
  },
  sectionCard: {
    gap: 10,
    borderRadius: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  sectionCaption: {
    fontSize: 10,
    fontWeight: "600",
  },
  sectionStateBadge: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  sectionStateBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  row2: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  row2Bottom: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  flexInput: {
    flex: 1,
  },
  toggleWrap: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  toggleLabelWrap: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  toggleCaption: {
    fontSize: 10,
    fontWeight: "600",
  },
  toggleBadge: {
    minWidth: 84,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  imagePicker: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    minHeight: 144,
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  imagePlaceholderText: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  previewImage: {
    width: "100%",
    height: 144,
  },
  tierList: {
    gap: 8,
  },
  tierRow: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  tierStateBadge: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tierStateBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  tierRemoveBtn: {
    minWidth: 84,
  },
  variantCard: {
    gap: 10,
    borderRadius: 10,
  },
  variantHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  variantNameWrap: {
    flex: 1,
    gap: 2,
  },
  variantName: {
    fontSize: 13,
    fontWeight: "800",
  },
  variantCaption: {
    fontSize: 10,
    fontWeight: "600",
  },
  variantColorPreview: {
    width: 16,
    height: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
  },
  variantStateBadge: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  variantStateBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  variantImagePicker: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    minHeight: 120,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  variantImage: {
    width: "100%",
    height: 120,
  },
  variantActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionCard: {
    gap: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  helperText: {
    fontSize: 10,
    fontWeight: "600",
  },
  submitStateBadge: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  submitStateBadgeText: {
    flex: 1,
    fontSize: 10,
    fontWeight: "700",
  },
});
