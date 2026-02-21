import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  toolbarCard: {
    gap: 10,
    borderRadius: 10,
  },
  toolbarTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  toolbarTitleWrap: {
    flex: 1,
    gap: 2,
  },
  toolbarTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  toolbarSubtitle: {
    fontSize: 10,
    fontWeight: "600",
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statChipText: {
    fontSize: 10,
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  flexInput: {
    flex: 1,
  },
  primaryAction: {
    minWidth: 130,
  },
  listWrap: {
    gap: 10,
  },
  stockCard: {
    gap: 10,
    borderRadius: 10,
    padding: 12,
  },
  stockHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  imageWrap: {
    width: 68,
    height: 68,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  groupImage: {
    width: "100%",
    height: "100%",
  },
  headerInfo: {
    flex: 1,
    gap: 5,
  },
  groupName: {
    fontSize: 14,
    fontWeight: "800",
  },
  groupMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  metaBadge: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  metaBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  priceGrid: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  priceCell: {
    minWidth: 110,
    flex: 1,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 7,
    gap: 2,
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: "700",
  },
  priceValue: {
    fontSize: 12,
    fontWeight: "900",
  },
  variantList: {
    gap: 8,
  },
  variantRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 7,
  },
  variantTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  variantIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  variantImageWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  variantImage: {
    width: "100%",
    height: "100%",
  },
  colorDot: {
    width: 13,
    height: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
  },
  variantTitle: {
    fontSize: 12,
    fontWeight: "800",
    flex: 1,
  },
  qtyBadge: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  qtyBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  qtyValueBadge: {
    marginLeft: "auto",
  },
  variantBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  barcodeText: {
    flex: 1,
    fontSize: 10,
    fontWeight: "600",
  },
  variantPrice: {
    fontSize: 11,
    fontWeight: "900",
  },
  variantActionBtn: {
    minHeight: 32,
    minWidth: 102,
  },
  cardActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardActionBtn: {
    flex: 1,
  },
  paginationWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 4,
    marginBottom: 10,
  },
  pageButton: {
    flex: 1,
  },
  pageBadgeWrap: {
    minWidth: 92,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  pageText: {
    fontSize: 11,
    fontWeight: "800",
  },
  drawerCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    padding: 14,
    gap: 10,
    maxHeight: "84%",
  },
  drawerScroll: {
    maxHeight: "100%",
  },
  drawerScrollContent: {
    gap: 10,
    paddingBottom: 10,
  },
  drawerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  drawerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerTitleWrap: {
    flex: 1,
    gap: 1,
  },
  drawerTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  drawerSubtitle: {
    fontSize: 10,
    fontWeight: "600",
  },
  sectionCard: {
    gap: 8,
    borderRadius: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  sectionCaption: {
    fontSize: 10,
    fontWeight: "600",
  },
  row2: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  tierRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  tierRemoveBtn: {
    minWidth: 84,
  },
  variantEditList: {
    gap: 12,
  },
  variantEditCard: {
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  variantEditHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#D8E2ED",
  },
  variantEditTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  variantEditQtyChip: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  variantEditQtyChipText: {
    fontSize: 10,
    fontWeight: "700",
  },
  variantEditBody: {
    gap: 9,
  },
  variantEditColorRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  drawerActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
});
