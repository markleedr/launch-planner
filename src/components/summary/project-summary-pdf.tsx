import {
  Circle,
  Document,
  Image,
  Link,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import {
  BUYER_TYPE_LABELS,
  CATEGORY_LABELS,
  CHANNEL_LABELS,
  PROJECT_TYPE_LABELS,
  SEVERITY_LABELS,
  checklistProgress,
  formatAudWhole,
  formatPercent,
  formatProjectAddress,
  googleMapsUrl,
  resolveHeroImage,
  type PlannerSnapshot,
} from "@/lib/planner";
import { calculateProposalCost, PROJECT_PARTY_ROLE_LABELS } from "@/lib/procurement";
import { deriveProjectSummary, type PublicProjectParty } from "./summary-model";

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingHorizontal: 38,
    paddingBottom: 54,
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: "#111111",
    backgroundColor: "#ffffff",
  },
  headerBlock: { marginBottom: 14 },
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  brand: { fontFamily: "Helvetica-Bold", fontSize: 13 },
  mutedSmall: { fontSize: 7.5, color: "#555555", marginTop: 2 },
  hero: { width: "100%", height: 176, objectFit: "cover", marginBottom: 15 },
  eyebrow: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: { fontFamily: "Helvetica-Bold", fontSize: 25, marginBottom: 5 },
  subtitle: { fontSize: 9, color: "#444444", marginBottom: 12 },
  blurb: { fontSize: 10, lineHeight: 1.55, color: "#333333", marginBottom: 17 },
  section: { marginTop: 12, marginBottom: 4 },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#111111",
    marginBottom: 7,
  },
  metrics: { flexDirection: "row", gap: 8, marginBottom: 8 },
  metric: { flexGrow: 1, borderWidth: 0.6, borderColor: "#777777", padding: 8 },
  metricLabel: { fontSize: 6.8, color: "#555555", marginBottom: 3 },
  metricValue: { fontFamily: "Helvetica-Bold", fontSize: 12 },
  row: { flexDirection: "row", borderBottomWidth: 0.4, borderBottomColor: "#bbbbbb" },
  headerRow: { backgroundColor: "#eeeeee" },
  cell: { paddingVertical: 5, paddingHorizontal: 4, lineHeight: 1.35 },
  bold: { fontFamily: "Helvetica-Bold" },
  muted: { color: "#555555" },
  twoColumns: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  card: {
    width: "48.8%",
    borderWidth: 0.5,
    borderColor: "#888888",
    padding: 8,
    marginBottom: 2,
  },
  partyCard: {
    width: "32%",
    borderWidth: 0.5,
    borderColor: "#888888",
    padding: 8,
    marginBottom: 2,
  },
  map: {
    height: 88,
    borderWidth: 0.6,
    borderColor: "#777777",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 12,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 38,
    right: 38,
    paddingTop: 5,
    borderTopWidth: 0.6,
    borderTopColor: "#555555",
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#333333",
    fontSize: 6.5,
  },
});

export async function downloadProjectSummaryPdf(
  snapshot: PlannerSnapshot,
  parties: PublicProjectParty[],
  sharedFor?: string,
  sharedBy?: { fullName: string | null; organisationName: string | null } | null,
) {
  const hero = resolveHeroImage(snapshot.heroImageId, snapshot.heroImageUrl);
  const sourceHeroUrl =
    typeof window !== "undefined" ? new URL(hero.src, window.location.origin).href : hero.src;
  const heroUrl = typeof window !== "undefined" ? await grayscaleImage(sourceHeroUrl) : undefined;
  const blob = await pdf(
    <ProjectSummaryPdf
      snapshot={snapshot}
      parties={parties}
      heroUrl={heroUrl}
      sharedFor={sharedFor}
      sharedBy={sharedBy}
    />,
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFilename(snapshot.projectName)}-project-summary.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

export function ProjectSummaryPdf({
  snapshot,
  parties,
  heroUrl,
  sharedFor,
  sharedBy,
}: {
  snapshot: PlannerSnapshot;
  parties: PublicProjectParty[];
  heroUrl?: string;
  sharedFor?: string;
  sharedBy?: { fullName: string | null; organisationName: string | null } | null;
}) {
  const { financials, budget, grouped, schedule } = deriveProjectSummary(snapshot);
  const address = formatProjectAddress(snapshot.address) || snapshot.location;
  const mapsUrl = googleMapsUrl(snapshot.address);
  const year = new Date().getFullYear();
  const developerOrg = parties.find((party) => party.role === "developer")?.organisationName;
  const footerText = [
    "powered by project profile",
    developerOrg,
    snapshot.projectName,
    String(year),
  ]
    .filter(Boolean)
    .join(" | ");
  const mediaBudgetUsedPct =
    financials.mediaBudgetCents > 0 ? budget.grandTotalCents / financials.mediaBudgetCents : 0;
  const checklist = checklistProgress(snapshot.checklist);
  const sharedByLabel = sharedBy
    ? [sharedBy.fullName, sharedBy.organisationName].filter(Boolean).join(", ")
    : "";

  return (
    <Document
      title={`${snapshot.projectName} project summary`}
      author="Launch Planner"
      subject="Client-facing project plan"
    >
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.headerBlock}>
          <View style={styles.brandRow}>
            <Text style={styles.brand}>launch planner.</Text>
            {sharedFor ? <Text style={styles.mutedSmall}>Prepared for {sharedFor}</Text> : null}
          </View>
          {sharedByLabel ? <Text style={styles.mutedSmall}>Shared by {sharedByLabel}</Text> : null}
        </View>
        {heroUrl ? <Image src={heroUrl} style={styles.hero} /> : null}
        <Text style={styles.eyebrow}>{PROJECT_TYPE_LABELS[snapshot.projectType]}</Text>
        <Text style={styles.title}>{snapshot.projectName}</Text>
        {address ? <Text style={styles.subtitle}>{address}</Text> : null}
        {snapshot.projectBlurb ? <Text style={styles.blurb}>{snapshot.projectBlurb}</Text> : null}

        <View style={styles.metrics}>
          <Metric
            label="Gross Realisation Value"
            value={formatAudWhole(financials.grvCents)}
            hint={snapshot.units ? `${snapshot.units} units` : undefined}
          />
          <Metric
            label="Media budget"
            value={formatAudWhole(financials.mediaBudgetCents)}
            hint={`${formatPercent(financials.mediaBudgetPctOfGrv)} of GRV`}
          />
          <Metric
            label="Approved plan"
            value={formatAudWhole(budget.grandTotalCents)}
            hint={`${formatPercent(budget.totalPctOfGrv)} of GRV`}
          />
          <Metric
            label={
              budget.varianceVsMediaBudgetCents > 0 ? "Over media budget" : "Under media budget"
            }
            value={formatAudWhole(Math.abs(budget.varianceVsMediaBudgetCents))}
            hint={`${formatPercent(mediaBudgetUsedPct)} of media budget used`}
          />
        </View>

        <PdfSection title="Audience & channels">
          <Text>
            <Text style={styles.bold}>Buyer types: </Text>
            {snapshot.buyerTypes.map((item) => BUYER_TYPE_LABELS[item]).join(", ") ||
              "Not specified"}
          </Text>
          <Text style={{ marginTop: 4 }}>
            <Text style={styles.bold}>Channels: </Text>
            {snapshot.channels.map((item) => CHANNEL_LABELS[item]).join(", ") || "Not specified"}
          </Text>
        </PdfSection>

        {snapshot.personas.length > 0 ? (
          <PdfSection title="Who the buyers will be">
            <View style={styles.twoColumns}>
              {snapshot.personas.map((persona) => (
                <View key={persona.id} style={styles.card} wrap={false}>
                  <Text style={styles.bold}>{persona.name}</Text>
                  {persona.description ? (
                    <Text style={{ marginTop: 3, lineHeight: 1.4 }}>{persona.description}</Text>
                  ) : null}
                  {persona.motivations ? (
                    <Text style={{ marginTop: 3 }}>
                      <Text style={styles.bold}>Motivations: </Text>
                      {persona.motivations}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          </PdfSection>
        ) : null}

        {address ? (
          <PdfSection title="Project location">
            <View style={styles.map} wrap={false}>
              <Svg width={58} height={58} viewBox="0 0 58 58">
                <Path
                  d="M4 9 L21 3 L37 9 L54 3 L54 49 L37 55 L21 49 L4 55 Z M21 3 L21 49 M37 9 L37 55"
                  stroke="#333333"
                  strokeWidth={1.2}
                  fill="#f2f2f2"
                />
                <Circle cx={30} cy={26} r={5} fill="#111111" />
                <Path
                  d="M30 42 C30 42 21 31 21 25 C21 13 39 13 39 25 C39 31 30 42 30 42 Z"
                  stroke="#111111"
                  strokeWidth={1.5}
                  fill="none"
                />
              </Svg>
              <View style={{ flexGrow: 1 }}>
                <Text style={[styles.bold, { fontSize: 10 }]}>{address}</Text>
                {mapsUrl ? (
                  <Link src={mapsUrl} style={{ marginTop: 5, color: "#111111" }}>
                    View Google Maps listing
                  </Link>
                ) : null}
              </View>
            </View>
          </PdfSection>
        ) : null}

        <PdfSection title="Approved budget">
          <TableHeader
            columns={["Category", "Production & agency", "Media", "Total"]}
            widths={["38%", "22%", "18%", "22%"]}
          />
          {budget.categories.map((category) => (
            <View key={category.category} style={styles.row} wrap={false}>
              <Text style={[styles.cell, { width: "38%" }]}>
                {CATEGORY_LABELS[category.category]}
              </Text>
              <Text style={[styles.cell, { width: "22%", textAlign: "right" }]}>
                {formatAudWhole(category.productionCents)}
              </Text>
              <Text style={[styles.cell, { width: "18%", textAlign: "right" }]}>
                {formatAudWhole(category.mediaCents)}
              </Text>
              <Text style={[styles.cell, styles.bold, { width: "22%", textAlign: "right" }]}>
                {formatAudWhole(category.totalCents)}
              </Text>
            </View>
          ))}
          <View style={[styles.row, { borderBottomWidth: 0 }]} wrap={false}>
            <Text style={[styles.cell, styles.bold, { width: "38%" }]}>Total approved plan</Text>
            <Text style={[styles.cell, styles.bold, { width: "22%", textAlign: "right" }]}>
              {formatAudWhole(budget.productionTotalCents)}
            </Text>
            <Text style={[styles.cell, styles.bold, { width: "18%", textAlign: "right" }]}>
              {formatAudWhole(budget.mediaTotalCents)}
            </Text>
            <Text style={[styles.cell, styles.bold, { width: "22%", textAlign: "right" }]}>
              {formatAudWhole(budget.grandTotalCents)}
            </Text>
          </View>
          <Text style={{ marginTop: 5, lineHeight: 1.4 }}>
            This plan uses {formatPercent(mediaBudgetUsedPct)} of the{" "}
            {formatAudWhole(financials.mediaBudgetCents)} approved media budget, leaving{" "}
            {formatAudWhole(Math.abs(budget.varianceVsMediaBudgetCents))}{" "}
            {budget.varianceVsMediaBudgetCents > 0 ? "over budget" : "unallocated"}.
          </Text>
        </PdfSection>

        <PdfSection title="Deliverables">
          {grouped.map((group) => (
            <View key={group.category} style={{ marginBottom: 8 }}>
              <View wrap={false}>
                <Text style={[styles.bold, { marginBottom: 3 }]}>
                  {CATEGORY_LABELS[group.category]}
                </Text>
                <TableHeader columns={["Deliverable", "Timing", "Qty / months", "Approved cost"]} />
              </View>
              {group.items.map((deliverable) => {
                const total = calculateProposalCost({
                  notes: "",
                  setupBusinessDays: deliverable.setupLeadDays,
                  agencyOneOffCents: deliverable.agencyCostCents ?? 0,
                  agencyMonthlyCents: deliverable.agencyMonthlyCostCents ?? 0,
                  productionUnitCents: deliverable.productionCostCents,
                  productionToBeConfirmed: deliverable.productionCostTbc ?? false,
                  mediaOneOffCents: deliverable.mediaCostCents,
                  mediaMonthlyCents: deliverable.mediaMonthlyCostCents ?? 0,
                  quantity: deliverable.quantity ?? 1,
                  months: deliverable.months ?? 0,
                }).totalCents;
                return (
                  <View key={deliverable.id} style={styles.row} wrap={false}>
                    <View style={[styles.cell, { width: "43%" }]}>
                      <Text style={styles.bold}>{deliverable.name}</Text>
                      {deliverable.description ? (
                        <Text style={[styles.muted, { marginTop: 2 }]}>
                          {truncateForTable(deliverable.description)}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[styles.cell, { width: "21%" }]}>
                      {deliverable.setupLeadDays} business days
                    </Text>
                    <Text style={[styles.cell, { width: "16%" }]}>
                      {deliverable.quantity ?? 1} / {deliverable.months ?? 0}
                    </Text>
                    <Text style={[styles.cell, styles.bold, { width: "20%", textAlign: "right" }]}>
                      {formatAudWhole(total)}
                      {deliverable.productionCostTbc ? " *" : ""}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
          {snapshot.deliverables.some((deliverable) => deliverable.productionCostTbc) ? (
            <Text style={[styles.muted, { marginTop: 3 }]}>
              * Third-party production cost to be confirmed and currently counted as $0.
            </Text>
          ) : null}
        </PdfSection>

        <PdfSection title="Delivery schedule">
          {schedule.hasCycle ? (
            <Text style={{ marginBottom: 6 }}>
              Two or more deliverables depend on each other, so a schedule couldn&apos;t be
              calculated. Fix the circular dependency in Launch Planner to see dates here.
            </Text>
          ) : schedule.items.length > 0 ? (
            <Text style={{ marginBottom: 6, lineHeight: 1.4 }}>
              Runs {formatDate(schedule.projectStart)} to {formatDate(schedule.projectEnd)} (
              {schedule.projectDurationDays} days). Critical path:{" "}
              {schedule.criticalPath
                .map((id) => schedule.items.find((item) => item.id === id)?.name)
                .filter(Boolean)
                .join(" → ") || "none identified"}
              .
            </Text>
          ) : null}
          <TableHeader columns={["Deliverable", "Start", "Finish", "Duration"]} />
          {schedule.items.map((item) => (
            <View key={item.id} style={styles.row} wrap={false}>
              <Text style={[styles.cell, item.critical ? styles.bold : {}, { width: "44%" }]}>
                {item.name}
                {item.critical ? " (critical)" : ""}
              </Text>
              <Text style={[styles.cell, { width: "20%" }]}>{formatDate(item.start)}</Text>
              <Text style={[styles.cell, { width: "20%" }]}>{formatDate(item.end)}</Text>
              <Text style={[styles.cell, { width: "16%" }]}>{item.durationDays} days</Text>
            </View>
          ))}
        </PdfSection>

        <PdfSection title="Project team & suppliers">
          {parties.length > 0 ? (
            <View style={styles.twoColumns}>
              {parties.map((party) => (
                <View key={`${party.role}-${party.id}`} style={styles.partyCard} wrap={false}>
                  <Text style={styles.eyebrow}>{PROJECT_PARTY_ROLE_LABELS[party.role]}</Text>
                  <Text style={[styles.bold, { fontSize: 9.5 }]}>{party.organisationName}</Text>
                  {party.representativeName ? (
                    <Text style={{ marginTop: 3 }}>{party.representativeName}</Text>
                  ) : null}
                  {party.email ? <Text style={{ marginTop: 3 }}>{party.email}</Text> : null}
                  {party.phone ? <Text>{party.phone}</Text> : null}
                  {party.website ? <Text>{party.website}</Text> : null}
                </View>
              ))}
            </View>
          ) : (
            <Text>Project team details will be added as appointments are confirmed.</Text>
          )}
        </PdfSection>

        {snapshot.checklist.length > 0 ? (
          <PdfSection title={`Project readiness (${checklist.done}/${checklist.total} reviewed)`}>
            {checklist.openHigh > 0 ? (
              <Text style={[styles.bold, { marginBottom: 5 }]}>
                {checklist.openHigh} high-priority item{checklist.openHigh === 1 ? "" : "s"} still
                open.
              </Text>
            ) : null}
            {snapshot.checklist.map((item) => (
              <View key={item.id} style={styles.row} wrap={false}>
                <Text style={[styles.cell, { width: "72%" }]}>{item.title}</Text>
                <Text style={[styles.cell, { width: "14%" }]}>
                  {SEVERITY_LABELS[item.severity]}
                </Text>
                <Text style={[styles.cell, { width: "14%", textAlign: "right" }]}>
                  {item.done ? "Complete" : "Open"}
                </Text>
              </View>
            ))}
          </PdfSection>
        ) : null}

        <View style={styles.footer} fixed>
          <Text>{footerText}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {hint ? <Text style={styles.mutedSmall}>{hint}</Text> : null}
    </View>
  );
}

function PdfSection({
  title,
  children,
  wrap = true,
}: {
  title: string;
  children: React.ReactNode;
  wrap?: boolean;
}) {
  return (
    <View style={styles.section} wrap={wrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function TableHeader({
  columns,
  widths = ["43%", "21%", "16%", "20%"],
}: {
  columns: [string, string, string, string];
  widths?: [string, string, string, string];
}) {
  return (
    <View style={[styles.row, styles.headerRow]}>
      {columns.map((column, index) => (
        <Text
          key={column}
          style={[
            styles.cell,
            styles.bold,
            {
              width: widths[index],
              textAlign: index === 3 ? "right" : "left",
            },
          ]}
        >
          {column}
        </Text>
      ))}
    </View>
  );
}

/**
 * A deliverable's description can carry a full scope-of-work write-up (headings,
 * bullet lists) meant for the editable planner view. A summary table row can't
 * safely hold that: `wrap={false}` keeps a row from splitting mid-line, so a
 * description taller than one page would overflow past the page edge and get
 * clipped. Cap it here; the full scope stays available in the app.
 */
function truncateForTable(text: string, max = 280): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function safeFilename(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "project"
  );
}

async function grayscaleImage(source: string): Promise<string | undefined> {
  try {
    const response = await fetch(source);
    if (!response.ok) return undefined;
    const bitmap = await createImageBitmap(await response.blob());
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) return undefined;
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < pixels.data.length; index += 4) {
      const grey = Math.round(
        pixels.data[index] * 0.299 +
          pixels.data[index + 1] * 0.587 +
          pixels.data[index + 2] * 0.114,
      );
      pixels.data[index] = grey;
      pixels.data[index + 1] = grey;
      pixels.data[index + 2] = grey;
    }
    context.putImageData(pixels, 0, 0);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", 0.88);
  } catch {
    // A colour image would violate the black-and-white export requirement.
    return undefined;
  }
}
