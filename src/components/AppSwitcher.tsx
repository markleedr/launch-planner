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

const BLACK = "#131518";

/**
 * Product marks: one 24px grid, one rounded stroke weight, one solid dot.
 * Drawn in `currentColor`. Used in the menu tiles and the home page header.
 */
const MARK_PROPS = {
  width: "100%",
  height: "100%",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const IconLaunchPlanner: FC = () => (
  <svg {...MARK_PROPS} viewBox="0 0.5 24 24">
    <path d="M7 19V8.5L13 5.5V19" />
    <path d="M13 10.5H16.5V19" />
    <path d="M4 19.5H20" />
  </svg>
);

const IconConversionPages: FC = () => (
  <svg {...MARK_PROPS}>
    <rect x="3.5" y="5" width="17" height="14" rx="3" />
    <path d="M3.5 9.5H20.5" />
    <circle cx="12" cy="14.2" r="1.3" fill="currentColor" />
  </svg>
);

const IconCampaignReport: FC = () => (
  <svg {...MARK_PROPS} viewBox="0.35 -0.55 24 24">
    <path d="M6 13.5V17.5" />
    <path d="M11.5 9.5V17.5" />
    <path d="M17 11.5V17.5" />
    <circle cx="17" cy="7" r="1.6" fill="currentColor" stroke="none" />
  </svg>
);

const IconLeadReactivation: FC = () => (
  <svg {...MARK_PROPS}>
    <path d="M12 5A7 7 0 1 1 5.2 10.2" />
    <circle cx="7" cy="6.6" r="1.7" fill="currentColor" stroke="none" />
  </svg>
);

const IconContentProof: FC = () => (
  <svg {...MARK_PROPS} viewBox="0 0.35 24 24">
    <path d="M5 7H19" />
    <path d="M5 11.5H19" />
    <path d="M5 16H11" />
    <circle cx="17" cy="16" r="1.7" fill="currentColor" stroke="none" />
  </svg>
);

const IconManagedServices: FC = () => (
  <svg {...MARK_PROPS}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
  </svg>
);

const IconAdProof: FC = () => (
  <svg {...MARK_PROPS} viewBox="-0.5 0 24 24">
    <path d="M10.5 4.5H7a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h9a3 3 0 0 0 3-3v-3" />
    <path d="M8.5 11.5l3 3 7-8.5" />
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

export type ProductId = ToolId;

/** The yellow-circle product logo used in each site's home page header. */
export const ProductLogo: FC<{ id: ToolId; size?: number }> = ({ id, size = 48 }) => {
  const Icon = ICONS[id];
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full shadow-sm"
      style={{ width: size, height: size, background: YELLOW, color: BLACK }}
      aria-hidden="true"
    >
      <span style={{ display: "flex", width: size * 0.6, height: size * 0.6 }}>
        <Icon />
      </span>
    </span>
  );
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
                      background: YELLOW,
                      color: BLACK,
                      border: isCurrent ? `2px solid ${YELLOW}` : "2px solid transparent",
                      boxShadow: isCurrent ? "0 0 0 3px rgba(252,195,23,0.18)" : "none",
                    }}
                  >
                    <span style={{ display: "flex", width: 28, height: 28 }}>
                      <Icon />
                    </span>
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
