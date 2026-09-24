import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  BarChart3,
  ClipboardList,
  CreditCard,
  FileText,
  FolderOpen,
  Home,
  LogOut,
  Menu,
  Plus,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { Wordmark } from "@/components/brand";
import Footer from "@/components/home/Footer";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BILLING_ENABLED } from "@/hooks/use-subscription";
import { supabase } from "@/integrations/supabase/client";
import { createBillingPortalSession } from "@/lib/billing/billing.server";
import { cn } from "@/lib/utils";

type AppSection = "projects" | "plan" | "summary" | "procurement" | "account";

interface AppShellProps {
  active: AppSection;
  children: ReactNode;
  headerActions?: ReactNode;
  projectId?: string | null;
  projectNavigation?: boolean;
  showFooter?: boolean;
  title: string;
}

interface SidebarContentProps {
  active: AppSection;
  billingBusy: boolean;
  onBilling: () => void;
  onNavigate?: () => void;
  onSignOut: () => void;
  projectId?: string | null;
  projectName: string;
  projectNavigation: boolean;
}

export function AppShell({
  active,
  children,
  headerActions,
  projectId,
  projectNavigation = false,
  showFooter = false,
  title,
}: AppShellProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);

  async function manageBilling() {
    setBillingBusy(true);
    try {
      const { url } = await createBillingPortalSession();
      window.location.assign(url);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Could not open billing.");
      setBillingBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  const sidebarProps = {
    active,
    billingBusy,
    onBilling: () => void manageBilling(),
    onSignOut: () => void signOut(),
    projectId,
    projectName: title,
    projectNavigation,
  };

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 bg-sidebar text-sidebar-foreground print:hidden lg:flex">
        <SidebarContent {...sidebarProps} />
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur print:hidden">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
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
                  <SidebarContent {...sidebarProps} onNavigate={() => setMenuOpen(false)} />
                </SheetContent>
              </Sheet>
              <Wordmark className="text-base lg:hidden" />
              {projectNavigation ? (
                <Link to="/projects" className="min-w-0 rounded-sm hover:underline">
                  <p className="hidden text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground lg:block">
                    Launch Planner
                  </p>
                  <p className="truncate text-sm font-semibold text-foreground">{title}</p>
                </Link>
              ) : (
                <div className="hidden min-w-0 lg:block">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Launch Planner
                  </p>
                  <p className="truncate text-sm font-semibold text-foreground">{title}</p>
                </div>
              )}
            </div>
            {headerActions ? <div className="shrink-0">{headerActions}</div> : null}
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          <main className="flex-1">{children}</main>
          {showFooter ? <Footer /> : null}
        </div>
      </div>
    </div>
  );
}

function SidebarContent({
  active,
  billingBusy,
  onBilling,
  onNavigate,
  onSignOut,
  projectId,
  projectName,
  projectNavigation,
}: SidebarContentProps) {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="border-b border-sidebar-border px-5 py-6">
        <Wordmark className="text-xl text-white" />
        <p className="mt-1 text-xs text-sidebar-foreground/55">Property marketing workspace</p>
      </div>

      <nav aria-label="Primary navigation" className="flex flex-1 flex-col overflow-y-auto p-3">
        {projectNavigation ? (
          <div className="mb-5">
            <SidebarLabel>Current project</SidebarLabel>
            <Link
              to="/projects"
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
              to="/planner"
              projectId={projectId}
            />
            <SidebarLink
              active={active === "summary"}
              icon={<FileText />}
              label="Summary"
              onNavigate={onNavigate}
              to="/planner/summary"
              projectId={projectId}
            />
            <SidebarLink
              active={active === "procurement"}
              icon={<ClipboardList />}
              label="Quotes"
              onNavigate={onNavigate}
              to="/planner/procurement"
              projectId={projectId}
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
            to="/projects"
          />
          <SidebarLink
            active={false}
            icon={<Plus />}
            label="New project"
            onNavigate={onNavigate}
            to="/planner/new"
          />
        </div>
      </nav>

      <nav aria-label="Account navigation" className="space-y-1 border-t border-sidebar-border p-3">
        <SidebarLink
          active={active === "account"}
          icon={<Settings />}
          label="Account"
          onNavigate={onNavigate}
          to="/account"
        />
        {BILLING_ENABLED ? (
          <button
            type="button"
            className={SIDEBAR_LINK_CLASS}
            disabled={billingBusy}
            onClick={onBilling}
          >
            <CreditCard />
            <span>{billingBusy ? "Opening billing…" : "Billing"}</span>
          </button>
        ) : null}
        <SidebarLink active={false} icon={<Home />} label="Home" onNavigate={onNavigate} to="/" />
        <button type="button" className={SIDEBAR_LINK_CLASS} onClick={onSignOut}>
          <LogOut />
          <span>Sign out</span>
        </button>
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

interface SidebarLinkProps {
  active: boolean;
  icon: ReactNode;
  label: string;
  onNavigate?: () => void;
  projectId?: string | null;
  to:
    | "/"
    | "/account"
    | "/planner"
    | "/planner/new"
    | "/planner/procurement"
    | "/planner/summary"
    | "/projects";
}

const PLANNER_TABS = new Set(["/planner", "/planner/summary", "/planner/procurement"]);

function SidebarLink({ active, icon, label, onNavigate, projectId, to }: SidebarLinkProps) {
  const search =
    to === "/account" ? {} : PLANNER_TABS.has(to) && projectId ? { projectId } : undefined;
  return (
    <Link
      to={to}
      search={search}
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
  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-sidebar-foreground/65 transition-colors hover:bg-white/[0.07] hover:text-white disabled:cursor-wait disabled:opacity-60 [&_svg]:size-[1.125rem] [&_svg]:shrink-0";

const SIDEBAR_LINK_ACTIVE_CLASS =
  "bg-brand/20 text-white shadow-[inset_3px_0_0_var(--brand)] hover:bg-brand/25 [&_svg]:text-brand";
