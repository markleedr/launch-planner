import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { BarChart3, FileText, FolderOpen, Home, Menu, Plus } from "lucide-react";
import { BrandLockup, Wordmark } from "@/components/brand";
import { useGuestDemo } from "@/components/guest-demo/guest-demo-context";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { GuestDemoBasePath } from "@/lib/guest-demo/campaign";
import { guestPath } from "@/lib/guest-demo/campaign";
import { cn } from "@/lib/utils";

type GuestSection = "projects" | "plan" | "summary";

interface GuestShellProps {
  active: GuestSection;
  children: ReactNode;
  headerActions?: ReactNode;
  projectNavigation?: boolean;
  title: string;
}

/** AppShell lookalike for public guest demos. No account or billing. */
export function GuestShell({
  active,
  children,
  headerActions,
  projectNavigation = false,
  title,
}: GuestShellProps) {
  const campaign = useGuestDemo();
  const [menuOpen, setMenuOpen] = useState(false);

  const sidebar = (
    <GuestSidebar
      active={active}
      basePath={campaign.basePath}
      brandLine={campaign.brandLine}
      onNavigate={() => setMenuOpen(false)}
      projectName={title}
      projectNavigation={projectNavigation}
    />
  );

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 bg-sidebar text-sidebar-foreground print:hidden lg:flex">
        {sidebar}
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b bg-card/95 shadow-sm backdrop-blur print:hidden">
          <div className="flex min-h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    aria-label="Open navigation"
                  >
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
                >
                  <SheetTitle className="sr-only">Launch Planner navigation</SheetTitle>
                  {sidebar}
                </SheetContent>
              </Sheet>
              <Wordmark className="text-base lg:hidden" />
              <div className="hidden min-w-0 lg:block">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {campaign.brandLine}
                </p>
                <p className="truncate text-xl font-bold tracking-tight text-foreground">{title}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">{headerActions}</div>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

function GuestSidebar({
  active,
  basePath,
  brandLine,
  onNavigate,
  projectName,
  projectNavigation,
}: {
  active: GuestSection;
  basePath: GuestDemoBasePath;
  brandLine: string;
  onNavigate?: () => void;
  projectName: string;
  projectNavigation: boolean;
}) {
  const home = guestPath(basePath) as GuestDemoBasePath;
  const plan = guestPath(basePath, "/plan") as `${GuestDemoBasePath}/plan`;
  const summary = guestPath(basePath, "/summary") as `${GuestDemoBasePath}/summary`;
  const newProject = guestPath(basePath, "/new") as `${GuestDemoBasePath}/new`;

  return (
    <div className="flex h-full w-full flex-col">
      <div className="border-b border-sidebar-border px-5 py-6">
        <BrandLockup className="text-white" />
        <p className="mt-3 text-xs text-sidebar-foreground/55">{brandLine}</p>
      </div>

      <nav aria-label="Primary navigation" className="flex flex-1 flex-col overflow-y-auto p-3">
        {projectNavigation ? (
          <div className="mb-5">
            <SidebarLabel>Current project</SidebarLabel>
            <Link
              to={home}
              onClick={onNavigate}
              className="mb-1 block truncate rounded-lg px-3 py-1 text-sm font-semibold text-white hover:underline"
            >
              {projectName}
            </Link>
            <SidebarLink
              active={active === "plan"}
              icon={<BarChart3 />}
              label="Plan"
              onNavigate={onNavigate}
              to={plan}
            />
            <SidebarLink
              active={active === "summary"}
              icon={<FileText />}
              label="Summary"
              onNavigate={onNavigate}
              to={summary}
            />
          </div>
        ) : null}

        <div>
          <SidebarLabel>Workspace</SidebarLabel>
          <SidebarLink
            active={active === "projects"}
            icon={<FolderOpen />}
            label="Projects"
            onNavigate={onNavigate}
            to={home}
          />
          <SidebarLink
            active={false}
            icon={<Plus />}
            label="New project"
            onNavigate={onNavigate}
            to={newProject}
          />
        </div>
      </nav>

      <nav aria-label="Site navigation" className="space-y-1 border-t border-sidebar-border p-3">
        <p className="px-3 py-2 text-xs leading-relaxed text-sidebar-foreground/50">
          No login required. Email only to export a PDF.
        </p>
        <Link to="/" onClick={onNavigate} className={SIDEBAR_LINK_CLASS}>
          <Home />
          <span>launchplanner.com.au</span>
        </Link>
      </nav>
    </div>
  );
}

function SidebarLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 px-3 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/40">
      {children}
    </p>
  );
}

function SidebarLink({
  active,
  icon,
  label,
  onNavigate,
  to,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onNavigate?: () => void;
  to:
    | "/urban-developer"
    | "/urban-developer/new"
    | "/urban-developer/plan"
    | "/urban-developer/summary"
    | "/webinar-23-sept"
    | "/webinar-23-sept/new"
    | "/webinar-23-sept/plan"
    | "/webinar-23-sept/summary"
    | "/start"
    | "/start/new"
    | "/start/plan"
    | "/start/summary";
}) {
  return (
    <Link
      to={to}
      className={cn(SIDEBAR_LINK_CLASS, active && SIDEBAR_LINK_ACTIVE_CLASS)}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

const SIDEBAR_LINK_CLASS =
  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-sidebar-foreground/65 transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar [&_svg]:size-[1.125rem] [&_svg]:shrink-0";

const SIDEBAR_LINK_ACTIVE_CLASS =
  "bg-brand/20 text-white shadow-[inset_3px_0_0_var(--brand)] hover:bg-brand/25 [&_svg]:text-brand";
