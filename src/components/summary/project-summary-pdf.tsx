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
  type Severity,
} from "@/lib/planner";
import { calculateProposalCost, PROJECT_PARTY_ROLE_LABELS } from "@/lib/procurement";
import { deriveProjectSummary, type PublicProjectParty } from "./summary-model";

/** Launch Planner reporting UI palette (Brand Guidelines v2025.1), as hex for react-pdf. */
const BRAND_YELLOW = "#FFD600";
const BRAND_DARK = "#131518";
const MUTED_TEXT = "#5B6169";
const PANEL = "#F6F6F4";
const ACCENT_TINT = "#FFF6D6";
const POSITIVE = "#1E7A3D";
const NEGATIVE = "#C0392B";
const AMBER = "#B45309";

const SEVERITY_COLOR: Record<Severity, string> = {
  high: NEGATIVE,
  medium: AMBER,
  low: MUTED_TEXT,
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingHorizontal: 38,
    paddingBottom: 58,
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: BRAND_DARK,
    backgroundColor: "#FCFCFB",
  },
  headerBlock: { marginBottom: 14 },
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  brand: { fontFamily: "Helvetica-Bold", fontSize: 13 },
  mutedSmall: { fontSize: 7.5, color: MUTED_TEXT, marginTop: 2 },
  headerRule: { marginTop: 9, height: 2, backgroundColor: BRAND_YELLOW },
  hero: { width: "100%", height: 176, objectFit: "cover", marginBottom: 15 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 5 },
  eyebrowMark: { width: 9, height: 9, backgroundColor: BRAND_YELLOW },
  eyebrow: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: { fontFamily: "Helvetica-Bold", fontSize: 25, marginBottom: 5 },
  subtitle: { fontSize: 9, color: MUTED_TEXT, marginBottom: 12 },
  blurb: { fontSize: 10, lineHeight: 1.55, color: "#333333", marginBottom: 17 },
  section: { marginTop: 12, marginBottom: 4 },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    paddingBottom: 5,
    borderBottomWidth: 2,
    borderBottomColor: BRAND_YELLOW,
    marginBottom: 7,
  },
  metrics: { flexDirection: "row", gap: 8, marginBottom: 8 },
  metric: {
    flexGrow: 1,
    backgroundColor: PANEL,
    borderTopWidth: 3,
    borderTopColor: BRAND_YELLOW,
    paddingTop: 9,
    paddingBottom: 9,
    paddingHorizontal: 9,
  },
  metricLabel: {
    fontSize: 6.8,
    color: MUTED_TEXT,
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  metricValue: { fontFamily: "Helvetica-Bold", fontSize: 13, color: BRAND_DARK },
  row: { flexDirection: "row", borderBottomWidth: 0.4, borderBottomColor: "#E2E4E8" },
  rowAlt: { backgroundColor: PANEL },
  totalRow: {
    backgroundColor: ACCENT_TINT,
    borderBottomWidth: 0,
    borderTopWidth: 1.5,
    borderTopColor: BRAND_YELLOW,
  },
  headerRow: { backgroundColor: BRAND_DARK },
  headerCell: { color: "#FFFFFF" },
  cell: { paddingVertical: 5, paddingHorizontal: 4, lineHeight: 1.35 },
  bold: { fontFamily: "Helvetica-Bold" },
  muted: { color: MUTED_TEXT },
  insight: {
    marginTop: 6,
    backgroundColor: ACCENT_TINT,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_YELLOW,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  insightText: { fontSize: 8, lineHeight: 1.4, color: BRAND_DARK },
  twoColumns: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  card: {
    width: "48.8%",
    backgroundColor: PANEL,
    borderTopWidth: 2,
    borderTopColor: BRAND_YELLOW,
    padding: 9,
    marginBottom: 2,
  },
  partyCard: {
    width: "32%",
    backgroundColor: PANEL,
    borderTopWidth: 2,
    borderTopColor: BRAND_YELLOW,
    padding: 9,
    marginBottom: 2,
  },
  map: {
    height: 88,
    backgroundColor: PANEL,
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
    paddingTop: 6,
    paddingBottom: 6,
    paddingHorizontal: 10,
    borderTopWidth: 2,
    borderTopColor: BRAND_YELLOW,
    backgroundColor: BRAND_DARK,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#FFFFFF",
    fontSize: 6.5,
  },
  letterhead: {
    marginTop: 16,
    backgroundColor: BRAND_DARK,
    borderTopWidth: 4,
    borderTopColor: BRAND_YELLOW,
    padding: 14,
  },
  letterheadRow: { flexDirection: "row", alignItems: "center", gap: 24, flexWrap: "wrap" },
  letterheadMonogram: { fontFamily: "Helvetica-Bold", fontSize: 16, color: "#FFFFFF" },
  letterheadText: { fontSize: 7.5, color: "#FFFFFF", lineHeight: 1.5 },
});

export async function downloadProjectSummaryPdf(
  snapshot: PlannerSnapshot,
  parties: PublicProjectParty[],
  sharedFor?: string,
  sharedBy?: { fullName: string | null; organisationName: string | null } | null,
  hideBudgets = false,
) {
  const hero = resolveHeroImage(snapshot.heroImageId, snapshot.heroImageUrl);
  const heroUrl =
    typeof window !== "undefined" ? new URL(hero.src, window.location.origin).href : hero.src;
  const blob = await pdf(
    <ProjectSummaryPdf
      snapshot={snapshot}
      parties={parties}
      heroUrl={heroUrl}
      sharedFor={sharedFor}
      sharedBy={sharedBy}
      hideBudgets={hideBudgets}
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
  hideBudgets = false,
}: {
  snapshot: PlannerSnapshot;
  parties: PublicProjectParty[];
  heroUrl?: string;
  sharedFor?: string;
  sharedBy?: { fullName: string | null; organisationName: string | null } | null;
  hideBudgets?: boolean;
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
  const overBudget = budget.varianceVsMediaBudgetCents > 0;
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
            <Text style={styles.brand}>
              launch planner
              <Text style={{ color: BRAND_YELLOW }}>.</Text>
            </Text>
            {sharedFor ? <Text style={styles.mutedSmall}>Prepared for {sharedFor}</Text> : null}
          </View>
          <Text style={styles.mutedSmall}>from concept to completion.</Text>
          {sharedByLabel ? <Text style={styles.mutedSmall}>Shared by {sharedByLabel}</Text> : null}
          <View style={styles.headerRule} />
        </View>
        {heroUrl ? <Image src={heroUrl} style={styles.hero} /> : null}
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowMark} />
          <Text style={styles.eyebrow}>{PROJECT_TYPE_LABELS[snapshot.projectType]}</Text>
        </View>
        <Text style={styles.title}>{snapshot.projectName}</Text>
        {address ? <Text style={styles.subtitle}>{address}</Text> : null}
        {snapshot.projectBlurb ? <Text style={styles.blurb}>{snapshot.projectBlurb}</Text> : null}

        <View style={styles.metrics}>
          <Metric
            label="Gross Realisation Value"
            value={formatAudWhole(financials.grvCents)}
            hint={snapshot.units ? `${snapshot.units} units` : undefined}
          />
          {hideBudgets ? null : (
            <>
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
                label={overBudget ? "Over media budget" : "Under media budget"}
                value={formatAudWhole(Math.abs(budget.varianceVsMediaBudgetCents))}
                hint={`${formatPercent(mediaBudgetUsedPct)} of media budget used`}
                accent={overBudget ? NEGATIVE : POSITIVE}
                valueColor={overBudget ? NEGATIVE : POSITIVE}
              />
            </>
          )}
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
                  stroke={BRAND_DARK}
                  strokeWidth={1.2}
                  fill="#FFFFFF"
                />
                <Path
                  d="M30 42 C30 42 21 31 21 25 C21 13 39 13 39 25 C39 31 30 42 30 42 Z"
                  stroke={BRAND_DARK}
                  strokeWidth={1.5}
                  fill={BRAND_YELLOW}
                />
                <Circle cx={30} cy={26} r={5} fill={BRAND_DARK} />
              </Svg>
              <View style={{ flexGrow: 1 }}>
                <Text style={[styles.bold, { fontSize: 10 }]}>{address}</Text>
                {mapsUrl ? (
                  <Link src={mapsUrl} style={{ marginTop: 5, color: BRAND_DARK }}>
                    View Google Maps listing
                  </Link>
                ) : null}
              </View>
            </View>
          </PdfSection>
        ) : null}

        {hideBudgets ? null : (
          <PdfSection title="Approved budget">
            <TableHeader
              columns={["Category", "Production & agency", "Media", "Total"]}
              widths={["38%", "22%", "18%", "22%"]}
            />
            {budget.categories.map((category, index) => (
              <View key={category.category} style={rowStyle(index)} wrap={false}>
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
            <View style={[styles.row, styles.totalRow]} wrap={false}>
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
            <View style={styles.insight}>
              <Text style={styles.insightText}>
                This plan uses {formatPercent(mediaBudgetUsedPct)} of the{" "}
                {formatAudWhole(financials.mediaBudgetCents)} approved media budget, leaving{" "}
                {formatAudWhole(Math.abs(budget.varianceVsMediaBudgetCents))}{" "}
                {overBudget ? "over budget" : "unallocated"}.
              </Text>
            </View>
          </PdfSection>
        )}

        <PdfSection title="Deliverables">
          {grouped.map((group) => (
            <View key={group.category} style={{ marginBottom: 8 }}>
              <View wrap={false}>
                <Text style={[styles.bold, { marginBottom: 3 }]}>
                  {CATEGORY_LABELS[group.category]}
                </Text>
                <TableHeader
                  columns={
                    hideBudgets
                      ? ["Deliverable", "Timing", "Qty / months"]
                      : ["Deliverable", "Timing", "Qty / months", "Approved cost"]
                  }
                  widths={hideBudgets ? ["54%", "26%", "20%"] : ["43%", "21%", "16%", "20%"]}
                />
              </View>
              {group.items.map((deliverable, index) => {
                const total = hideBudgets
                  ? 0
                  : calculateProposalCost({
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
                  <View key={deliverable.id} style={rowStyle(index)} wrap={false}>
                    <View style={[styles.cell, { width: hideBudgets ? "54%" : "43%" }]}>
                      <Text style={styles.bold}>{deliverable.name}</Text>
                      {deliverable.description ? (
                        <Text style={[styles.muted, { marginTop: 2 }]}>
                          {truncateForTable(deliverable.description)}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[styles.cell, { width: hideBudgets ? "26%" : "21%" }]}>
                      {deliverable.setupLeadDays} business days
                    </Text>
                    <Text style={[styles.cell, { width: hideBudgets ? "20%" : "16%" }]}>
                      {deliverable.quantity ?? 1} / {deliverable.months ?? 0}
                    </Text>
                    {hideBudgets ? null : (
                      <Text
                        style={[styles.cell, styles.bold, { width: "20%", textAlign: "right" }]}
                      >
                        {formatAudWhole(total)}
                        {deliverable.productionCostTbc ? " *" : ""}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
          {!hideBudgets &&
          snapshot.deliverables.some((deliverable) => deliverable.productionCostTbc) ? (
            <Text style={[styles.muted, { marginTop: 3 }]}>
              * Third-party production cost to be confirmed and currently counted as $0.
            </Text>
          ) : null}
        </PdfSection>

        <PdfSection title="Delivery schedule">
          {schedule.hasCycle ? (
            <View style={styles.insight}>
              <Text style={styles.insightText}>
                Two or more deliverables depend on each other, so a schedule couldn&apos;t be
                calculated. Fix the circular dependency in Launch Planner to see dates here.
              </Text>
            </View>
          ) : schedule.items.length > 0 ? (
            <View style={styles.insight}>
              <Text style={styles.insightText}>
                Runs {formatDate(schedule.projectStart)} to {formatDate(schedule.projectEnd)} (
                {schedule.projectDurationDays} days). Critical path:{" "}
                {schedule.criticalPath
                  .map((id) => schedule.items.find((item) => item.id === id)?.name)
                  .filter(Boolean)
                  .join(" → ") || "none identified"}
                .
              </Text>
            </View>
          ) : null}
          <TableHeader columns={["Deliverable", "Start", "Finish", "Duration"]} marginTop={6} />
          {schedule.items.map((item, index) => (
            <View key={item.id} style={rowStyle(index)} wrap={false}>
              <Text
                style={[
                  styles.cell,
                  { width: "44%" },
                  item.critical ? styles.bold : {},
                  item.critical ? { color: NEGATIVE } : {},
                ]}
              >
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
                  <Text style={[styles.bold, { fontSize: 9.5, marginTop: 3 }]}>
                    {party.organisationName}
                  </Text>
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
              <View style={[styles.insight, { marginTop: 0, marginBottom: 7 }]}>
                <Text style={[styles.insightText, styles.bold]}>
                  {checklist.openHigh} high-priority item{checklist.openHigh === 1 ? "" : "s"} still
                  open.
                </Text>
              </View>
            ) : null}
            <TableHeader columns={["Item", "Priority", "Status"]} widths={["72%", "14%", "14%"]} />
            {snapshot.checklist.map((item, index) => (
              <View key={item.id} style={rowStyle(index)} wrap={false}>
                <Text style={[styles.cell, { width: "72%" }]}>{item.title}</Text>
                <Text style={[styles.cell, { width: "14%", color: SEVERITY_COLOR[item.severity] }]}>
                  {SEVERITY_LABELS[item.severity]}
                </Text>
                <Text
                  style={[
                    styles.cell,
                    { width: "14%", textAlign: "right", color: item.done ? POSITIVE : MUTED_TEXT },
                  ]}
                >
                  {item.done ? "Complete" : "Open"}
                </Text>
              </View>
            ))}
          </PdfSection>
        ) : null}

        <View style={styles.letterhead} wrap={false}>
          <View style={styles.letterheadRow}>
            <Text style={styles.letterheadMonogram}>
              lp<Text style={{ color: BRAND_YELLOW }}>.</Text>
            </Text>
            <View>
              <Text style={styles.letterheadText}>Launch Planner</Text>
              <Text style={styles.letterheadText}>54/111 Eagle Street, Brisbane, QLD 4000</Text>
            </View>
            <View>
              <Text style={styles.letterheadText}>07 3132 1625</Text>
              <Text style={styles.letterheadText}>admin@launchplanner.com.au</Text>
              <Text style={styles.letterheadText}>www.launchplanner.com.au</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>{footerText}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

function rowStyle(index: number) {
  return index % 2 === 1 ? [styles.row, styles.rowAlt] : styles.row;
}

function Metric({
  label,
  value,
  hint,
  accent = BRAND_YELLOW,
  valueColor = BRAND_DARK,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
  valueColor?: string;
}) {
  return (
    <View style={[styles.metric, { borderTopColor: accent }]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: valueColor }]}>{value}</Text>
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
  marginTop = 0,
}: {
  columns: string[];
  widths?: string[];
  marginTop?: number;
}) {
  return (
    <View style={[styles.row, styles.headerRow, { marginTop }]}>
      {columns.map((column, index) => (
        <Text
          key={column}
          style={[
            styles.cell,
            styles.bold,
            styles.headerCell,
            {
              width: widths[index] ?? `${100 / columns.length}%`,
              textAlign: index === columns.length - 1 && columns.length > 3 ? "right" : "left",
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
