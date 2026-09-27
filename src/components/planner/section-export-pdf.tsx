/* eslint-disable react-refresh/only-export-components -- the download helpers belong with this document */
import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { sectionFilename, type SectionExport } from "@/lib/planner";

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingHorizontal: 28,
    paddingBottom: 46,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#111111",
    backgroundColor: "#ffffff",
  },
  brand: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  eyebrow: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 8,
  },
  title: { fontFamily: "Helvetica-Bold", fontSize: 16, marginTop: 3, marginBottom: 8 },
  note: { fontSize: 8, color: "#333333", marginBottom: 6 },
  tableTitle: { fontFamily: "Helvetica-Bold", fontSize: 10, marginTop: 10, marginBottom: 4 },
  row: { flexDirection: "row", borderBottomWidth: 0.4, borderBottomColor: "#bbbbbb" },
  headerRow: { backgroundColor: "#eeeeee", borderBottomColor: "#111111" },
  cell: { paddingVertical: 4, paddingHorizontal: 3, lineHeight: 1.3 },
  headerCell: { fontFamily: "Helvetica-Bold" },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 28,
    right: 28,
    paddingTop: 4,
    borderTopWidth: 0.6,
    borderTopColor: "#555555",
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#333333",
    fontSize: 7,
  },
});

export async function renderSectionPdfBlob(section: SectionExport): Promise<Blob> {
  return pdf(<SectionPdfDocument section={section} />).toBlob();
}

export async function downloadSectionPdf(section: SectionExport): Promise<void> {
  const blob = await renderSectionPdfBlob(section);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = sectionFilename(section, "pdf");
  link.click();
  URL.revokeObjectURL(url);
}

function SectionPdfDocument({ section }: { section: SectionExport }) {
  const wide = section.tables.some((table) => table.columns.length > 4);
  return (
    <Document title={`${section.projectName} ${section.title}`}>
      <Page size="A4" orientation={wide ? "landscape" : "portrait"} style={styles.page} wrap>
        <Text style={styles.brand}>Launch Planner</Text>
        <Text style={styles.eyebrow}>{section.projectName || "Untitled project"}</Text>
        <Text style={styles.title}>{section.title}</Text>
        {section.notes.map((note) => (
          <Text key={note} style={styles.note}>
            {note}
          </Text>
        ))}
        {section.tables.map((table) => (
          <View key={table.title ?? table.columns.join("|")} wrap>
            {table.title ? <Text style={styles.tableTitle}>{table.title}</Text> : null}
            <View style={[styles.row, styles.headerRow]} wrap={false}>
              {table.columns.map((column) => (
                <Text
                  key={column}
                  style={[
                    styles.cell,
                    styles.headerCell,
                    { width: columnWidth(table.columns.length) },
                  ]}
                >
                  {column}
                </Text>
              ))}
            </View>
            {table.rows.map((row, index) => (
              <View key={`${table.title ?? "table"}-${index}`} style={styles.row} wrap={false}>
                {row.map((cell, cellIndex) => (
                  <Text
                    key={`${index}-${cellIndex}`}
                    style={[styles.cell, { width: columnWidth(table.columns.length) }]}
                  >
                    {cell || " "}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        ))}
        <View style={styles.footer} fixed>
          <Text>Launch Planner</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

function columnWidth(count: number): string {
  return `${100 / Math.max(1, count)}%`;
}
