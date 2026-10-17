import { useEffect, useRef, useState, type FC } from "react";

/**
 * The Project Profile suite menu (the nine-dot button). One design across all
 * products, matching projectprofile.agency. Keep this file identical in every
 * product repo.
 */
const YELLOW = "#FCC317";

const TOOLS = [
  { id: "launch-planner", name: "Launch Planner", url: "https://launchplanner.com.au" },
  { id: "conversion-pages", name: "Conversion Pages", url: "https://www.conversionpages.com.au" },
  { id: "campaign-report", name: "Campaign Report", url: "https://www.campaignreport.com.au" },
  { id: "lead-reactivation", name: "Lead Reactivation", url: "https://leadreactivation.com.au/" },
  { id: "content-proof", name: "Content Proof", url: "https://contentproof.com.au/" },
  { id: "managed-services", name: "Managed Services", url: "https://managedservices.com.au/" },
  { id: "ad-proof", name: "Ad Proof", url: "https://adproof.com.au/" },
] as const;

type ToolId = (typeof TOOLS)[number]["id"];

const ICON_PROPS = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: YELLOW,
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const IconLaunchPlanner: FC = () => (
  <svg {...ICON_PROPS}>
    <rect x="3" y="3" width="7" height="7" rx="1" fill={YELLOW} opacity="0.35" />
    <rect x="14" y="3" width="7" height="7" rx="1" fill={YELLOW} opacity="0.35" />
    <rect x="3" y="14" width="7" height="7" rx="1" fill={YELLOW} opacity="0.35" />
    <line x1="17.5" y1="15" x2="17.5" y2="21" />
    <line x1="14.5" y1="18" x2="20.5" y2="18" />
  </svg>
);

const IconConversionPages: FC = () => (
  <svg {...ICON_PROPS}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="7" y1="13" x2="17" y2="13" />
    <line x1="7" y1="16.5" x2="14" y2="16.5" />
  </svg>
);

const IconCampaignReport: FC = () => (
  <svg {...ICON_PROPS}>
    <polyline points="2,12 6,12 9,6 12,18 15,10 18,14 22,14" />
  </svg>
);

const IconLeadReactivation: FC = () => (
  <svg {...ICON_PROPS}>
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <polyline points="21,3 21,8 16,8" />
    <line x1="12" y1="7" x2="12" y2="12" />
    <line x1="12" y1="12" x2="15.5" y2="14.5" />
  </svg>
);

const IconContentProof: FC = () => (
  <svg {...ICON_PROPS}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M9 12l2 2 4-4" />
    <line x1="8" y1="7" x2="16" y2="7" />
  </svg>
);

const IconManagedServices: FC = () => (
  <svg {...ICON_PROPS}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
  </svg>
);

const IconAdProof: FC = () => (
  <svg {...ICON_PROPS}>
    <rect x="3" y="4" width="18" height="14" rx="2" />
    <path d="M10 14l2 2 4-4" />
    <line x1="3" y1="21" x2="21" y2="21" />
  </svg>
);

const ICONS: Record<ToolId, FC> = {
  "launch-planner": IconLaunchPlanner,
  "conversion-pages": IconConversionPages,
  "campaign-report": IconCampaignReport,
  "lead-reactivation": IconLeadReactivation,
  "content-proof": IconContentProof,
  "managed-services": IconManagedServices,
  "ad-proof": IconAdProof,
};

const WaffleIcon: FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
    {[0, 6.5, 13].flatMap((y) =>
      [0, 6.5, 13].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" rx="1" />),
    )}
  </svg>
);

interface AppSwitcherProps {
  /** The product the visitor is on. Its tile is marked and does not navigate. */
  currentTool?: string;
  /** Borderless button for use over a hero photo. */
  hero?: boolean;
}

export default function AppSwitcher({ currentTool, hero = false }: AppSwitcherProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${
          hero ? "border border-transparent bg-transparent" : "border border-border bg-transparent"
        }`}
        aria-label="Project Profile property tools"
        aria-expanded={open}
      >
        <WaffleIcon />
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[300px] rounded-2xl border border-border bg-card text-card-foreground"
          style={{
            boxShadow: "0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)",
            animation: "ppSwitcherIn 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards",
            transformOrigin: "top right",
          }}
        >
          <div className="px-5 pb-2 pt-4">
            <span
              className="text-muted-foreground"
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "1.2px",
              }}
            >
              Property tools
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 px-4 pb-4">
            {TOOLS.map((tool, i) => {
              const isCurrent = tool.id === currentTool;
              const Icon = ICONS[tool.id];
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => {
                    if (!isCurrent) window.open(tool.url, "_blank", "noopener");
                    setOpen(false);
                  }}
                  className="group flex flex-col items-center rounded-lg px-1 py-3 transition-colors hover:bg-muted/60"
                  style={{
                    cursor: isCurrent ? "default" : "pointer",
                    animation: `ppSwitcherItemIn 0.25s ${0.04 * i}s cubic-bezier(0.34,1.56,0.64,1) both`,
                  }}
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full"
                    style={{
                      background: "rgba(252,195,23,0.12)",
                      border: isCurrent ? `2px solid ${YELLOW}` : "2px solid transparent",
                      boxShadow: isCurrent ? "0 0 0 3px rgba(252,195,23,0.18)" : "none",
                    }}
                  >
                    <Icon />
                  </div>
                  {isCurrent && (
                    <div
                      style={{
                        width: 16,
                        height: 3,
                        borderRadius: 2,
                        background: YELLOW,
                        marginTop: 4,
                      }}
                    />
                  )}
                  <span
                    className="mt-1.5 text-center leading-tight text-foreground"
                    style={{ fontSize: 11, fontWeight: 600 }}
                  >
                    {tool.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes ppSwitcherIn {
          from { opacity: 0; transform: scale(0.96) translateY(-8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes ppSwitcherItemIn {
          from { opacity: 0; transform: translateY(6px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
