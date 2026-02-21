import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  toolbarCard: {
    gap: 10,
    borderRadius: 10,
  },
  toolbarMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  toolbarMetaChip: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  toolbarMetaText: {
    fontSize: 10,
    fontWeight: "700",
  },
  filterActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  refreshBtn: {
    minWidth: 104,
  },
  summaryCard: {
    gap: 10,
    borderRadius: 10,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  summaryCaption: {
    fontSize: 10,
    fontWeight: "700",
  },
  summaryGrid: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  summaryCell: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    minWidth: 132,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  summaryCellLabel: {
    fontSize: 10,
    fontWeight: "700",
  },
  summaryCellValue: {
    fontSize: 12,
    fontWeight: "900",
  },
  listWrap: {
    gap: 10,
  },
  transactionCard: {
    gap: 10,
    borderRadius: 10,
    padding: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  cardTitleBlock: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  cardSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  cardSubText: {
    fontSize: 10,
    fontWeight: "600",
  },
  cardSubDot: {
    fontSize: 10,
    fontWeight: "700",
  },
  marginBadge: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  marginBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  amountHeroWrap: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDE8F2",
    backgroundColor: "#F8FCFF",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  amountHeroLabel: {
    fontSize: 10,
    fontWeight: "700",
  },
  amountHeroValue: {
    fontSize: 16,
    fontWeight: "900",
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  metricChip: {
    minWidth: 98,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 1,
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "700",
  },
  metricValue: {
    fontSize: 11,
    fontWeight: "900",
  },
  detailCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DFE8F1",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  infoText: {
    flex: 1,
    fontSize: 10,
    fontWeight: "600",
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
  modalCard: {
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
  modalScroll: {
    maxHeight: "100%",
  },
  modalScrollContent: {
    gap: 10,
    paddingBottom: 10,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modalIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitleWrap: {
    flex: 1,
    gap: 1,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  modalSubtitle: {
    fontSize: 10,
    fontWeight: "600",
  },
  modalSummaryCard: {
    gap: 6,
  },
  modalSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  modalSummaryLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  modalSummaryValue: {
    fontSize: 12,
    fontWeight: "800",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  flexBtn: {
    flex: 1,
  },
});
