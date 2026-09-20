import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  buildScheduleForLaunch,
  deserializePlanner,
  parseDollarsToCents,
  seedChecklist,
  seedContacts,
  serializePlanner,
  summariseBudget,
  summariseFinancials,
  type BudgetSummary,
  type BuyerPersona,
  type BuyerType,
  type ChannelCode,
  type ChecklistItem,
  type Contact,
  type Deliverable,
  type DeliverableCategory,
  type FinancialSummary,
  type PlannerSnapshot,
  type ProjectAddress,
  type ProjectType,
  type Schedule,
} from "@/lib/planner";
import type { ProjectParty } from "@/lib/procurement";

export interface GroupedCategory {
  category: DeliverableCategory;
  items: Deliverable[];
}

interface PlannerContextValue {
  // Intake
  projectName: string;
  setProjectName: (v: string) => void;
  projectBlurb: string;
  setProjectBlurb: (v: string) => void;
  projectType: ProjectType;
  setProjectType: (v: ProjectType) => void;
  units: number;
  setUnits: (v: number) => void;
  sellPrice: string;
  setSellPrice: (v: string) => void;
  mediaBudget: string;
  setMediaBudget: (v: string) => void;
  launchDate: string;
  setLaunchDate: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  address: ProjectAddress;
  setAddress: (v: ProjectAddress) => void;
  heroImageId: string;
  setHeroImageId: (v: string) => void;
  heroImageUrl: string;
  setHeroImageUrl: (v: string) => void;
  projectParties: ProjectParty[];
  setProjectParties: (v: ProjectParty[]) => void;
  standardCollectionBusinessDays: number;
  setStandardCollectionBusinessDays: (v: number) => void;
  buyerTypes: BuyerType[];
  setBuyerTypes: (v: BuyerType[]) => void;
  channels: ChannelCode[];
  setChannels: (v: ChannelCode[]) => void;
  personas: BuyerPersona[];
  setPersonas: (v: BuyerPersona[]) => void;
  // Deliverables
  deliverables: Deliverable[];
  setDeliverables: React.Dispatch<React.SetStateAction<Deliverable[]>>;
  updateDeliverable: (id: string, patch: Partial<Deliverable>) => void;
  removeDeliverable: (id: string) => void;
  addDeliverable: () => void;
  // Checklist & contacts
  checklist: ChecklistItem[];
  setChecklist: (v: ChecklistItem[]) => void;
  contacts: Contact[];
  setContacts: (v: Contact[]) => void;
  // Derived
  financials: FinancialSummary;
  budget: BudgetSummary;
  grouped: GroupedCategory[];
  schedule: Schedule;
  launchDateObj: Date | null;
  // Persistence
  currentProjectId: string | null;
  setCurrentProjectId: (v: string | null) => void;
  toSnapshot: () => PlannerSnapshot;
  hydrate: (snap: PlannerSnapshot) => void;
}

const PlannerContext = createContext<PlannerContextValue | null>(null);

const DRAFT_KEY = "launch-planner:draft";

/** Holds all project state so the editor and summary views share one source of
 *  truth. Lives in the /planner layout route, so navigating between tabs keeps
 *  the data (it resets on a full page reload until persistence is added). */
export function PlannerProvider({ children }: { children: ReactNode }) {
  const [projectName, setProjectName] = useState("New project");
  const [projectBlurb, setProjectBlurb] = useState(
    "A considered residential development supported by a coordinated launch plan designed to connect the project with its intended buyers.",
  );
  const [projectType, setProjectType] = useState<ProjectType>("multi_residential");
  const [units, setUnits] = useState(20);
  const [sellPrice, setSellPrice] = useState("750000");
  const [mediaBudget, setMediaBudget] = useState("300000");
  const [launchDate, setLaunchDate] = useState("");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState<ProjectAddress>({
    street: "",
    suburb: "",
    state: "",
    postcode: "",
  });
  const [heroImageId, setHeroImageId] = useState("apartments");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [projectParties, setProjectParties] = useState<ProjectParty[]>([]);
  const [standardCollectionBusinessDays, setStandardCollectionBusinessDays] = useState(10);
  const [buyerTypes, setBuyerTypes] = useState<BuyerType[]>(["owner_occupier"]);
  const [channels, setChannels] = useState<ChannelCode[]>(["ppc", "paid_social"]);
  const [personas, setPersonas] = useState<BuyerPersona[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() =>
    seedChecklist("multi_residential"),
  );
  const [contacts, setContacts] = useState<Contact[]>(seedContacts);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  // Set when a saved project is loaded, so the session draft never overwrites it.
  const externallyHydrated = useRef(false);

  const financials = useMemo(
    () =>
      summariseFinancials({
        units,
        sellPriceCents: parseDollarsToCents(sellPrice),
        mediaBudgetCents: parseDollarsToCents(mediaBudget),
      }),
    [units, sellPrice, mediaBudget],
  );

  const budget = useMemo(
    () =>
      summariseBudget(deliverables, {
        mediaBudgetCents: financials.mediaBudgetCents,
        grvCents: financials.grvCents,
      }),
    [deliverables, financials.mediaBudgetCents, financials.grvCents],
  );

  const grouped = useMemo(() => groupByCategory(deliverables), [deliverables]);

  const launchDateObj = useMemo(
    () => (launchDate ? new Date(`${launchDate}T00:00:00`) : null),
    [launchDate],
  );

  const schedule = useMemo(() => {
    return buildScheduleForLaunch(deliverables, launchDateObj);
  }, [deliverables, launchDateObj]);

  const value: PlannerContextValue = {
    projectName,
    setProjectName,
    projectBlurb,
    setProjectBlurb,
    projectType,
    setProjectType,
    units,
    setUnits,
    sellPrice,
    setSellPrice,
    mediaBudget,
    setMediaBudget,
    launchDate,
    setLaunchDate,
    location,
    setLocation,
    address,
    setAddress,
    heroImageId,
    setHeroImageId,
    heroImageUrl,
    setHeroImageUrl,
    projectParties,
    setProjectParties,
    standardCollectionBusinessDays,
    setStandardCollectionBusinessDays,
    buyerTypes,
    setBuyerTypes,
    channels,
    setChannels,
    personas,
    setPersonas,
    deliverables,
    setDeliverables,
    updateDeliverable(id, patch) {
      setDeliverables((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    },
    removeDeliverable(id) {
      setDeliverables((prev) => prev.filter((d) => d.id !== id));
    },
    addDeliverable() {
      const start = new Date();
      const end = new Date();
      end.setMonth(end.getMonth() + 6);
      setDeliverables((prev) => [
        ...prev,
        {
          id: `custom-${crypto.randomUUID()}`,
          name: "New service",
          category: "brand",
          productionCostCents: 0,
          mediaCostCents: 0,
          quantity: 1,
          months: 0,
          setupTimeValue: 10,
          setupTimeUnit: "business_days",
          setupLeadDays: 10,
          startDate: start,
          endDate: end,
        },
      ]);
    },
    checklist,
    setChecklist,
    contacts,
    setContacts,
    financials,
    budget,
    grouped,
    schedule,
    launchDateObj,
    currentProjectId,
    setCurrentProjectId,
    toSnapshot: () => ({
      projectName,
      projectBlurb,
      projectType,
      units,
      sellPrice,
      mediaBudget,
      launchDate,
      location,
      address,
      heroImageId,
      heroImageUrl,
      projectParties,
      standardCollectionBusinessDays,
      buyerTypes,
      channels,
      personas,
      deliverables,
      checklist,
      contacts,
    }),
    hydrate: (snap) => {
      externallyHydrated.current = true;
      setProjectName(snap.projectName);
      setProjectBlurb(snap.projectBlurb);
      setProjectType(snap.projectType);
      setUnits(snap.units);
      setSellPrice(snap.sellPrice);
      setMediaBudget(snap.mediaBudget);
      setLaunchDate(snap.launchDate);
      setLocation(snap.location);
      setAddress(snap.address);
      setHeroImageId(snap.heroImageId);
      setHeroImageUrl(snap.heroImageUrl);
      setProjectParties(snap.projectParties);
      setStandardCollectionBusinessDays(snap.standardCollectionBusinessDays);
      setBuyerTypes(snap.buyerTypes);
      setChannels(snap.channels);
      setPersonas(snap.personas);
      setDeliverables(snap.deliverables);
      setChecklist(snap.checklist);
      setContacts(snap.contacts);
    },
  };

  // ---- Session draft persistence -------------------------------------------
  // Keeps every field alive across tab navigation and reloads within the same
  // browser session, before/independently of saving to the database.
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    if (externallyHydrated.current) return; // a saved project was loaded first
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { projectId?: string | null; snapshot?: unknown };
      const snap = deserializePlanner(parsed.snapshot);
      if (!snap) return;
      value.hydrate(snap);
      if (parsed.projectId) setCurrentProjectId(parsed.projectId);
    } catch {
      // Ignore malformed drafts.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const serializedDraft = JSON.stringify(serializePlanner(value.toSnapshot()));

  useEffect(() => {
    if (!restoredRef.current) return;
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ projectId: currentProjectId, snapshot: JSON.parse(serializedDraft) }),
      );
    } catch {
      // Storage full or unavailable - drafts are best-effort.
    }
  }, [serializedDraft, currentProjectId]);

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner(): PlannerContextValue {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error("usePlanner must be used within a PlannerProvider");
  return ctx;
}

function groupByCategory(deliverables: Deliverable[]): GroupedCategory[] {
  const map = new Map<DeliverableCategory, Deliverable[]>();
  for (const d of deliverables) {
    const list = map.get(d.category) ?? [];
    list.push(d);
    map.set(d.category, list);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([category, items]) => ({ category, items }));
}
