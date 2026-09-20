import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

interface GetStartedButtonProps {
  className?: string;
  size?: "sm" | "lg" | "default" | "icon";
  children?: ReactNode;
  withArrow?: boolean;
  onNavigate?: () => void;
}

/**
 * Sends visitors to the pricing page, where they can book a demo or start
 * Stripe hosted Checkout for the single monthly plan.
 */
export function GetStartedButton({
  className,
  size,
  children = "Get Started",
  withArrow = true,
  onNavigate,
}: GetStartedButtonProps) {
  return (
    <Button size={size} className={className} asChild onClick={onNavigate}>
      <Link to="/pricing" search={{}}>
        {children}
        {withArrow && <ArrowRight className="ml-2 h-4 w-4" />}
      </Link>
    </Button>
  );
}
