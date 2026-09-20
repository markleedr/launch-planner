import { Link } from "@tanstack/react-router";

const Footer = () => {
  return (
    <footer className="w-full bg-background border-t py-4 sm:py-6 px-4 sm:px-6">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 lg:flex-row">
        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-x-6"
        >
          <Link
            to="/pricing"
            className="text-muted-foreground text-xs sm:text-sm hover:text-foreground transition-colors"
          >
            Pricing
          </Link>
          <Link
            to="/calculator"
            className="text-muted-foreground text-xs sm:text-sm hover:text-foreground transition-colors"
          >
            Media Calculator
          </Link>
          <Link
            to="/privacy"
            className="text-muted-foreground text-xs sm:text-sm hover:text-foreground transition-colors"
          >
            Privacy
          </Link>
          <Link
            to="/terms"
            className="text-muted-foreground text-xs sm:text-sm hover:text-foreground transition-colors"
          >
            Terms
          </Link>
          <Link
            to="/data-deletion"
            className="text-muted-foreground text-xs sm:text-sm hover:text-foreground transition-colors"
          >
            Data deletion
          </Link>
        </nav>
        <a
          href="https://www.launchplanner.com.au"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground text-xs sm:text-sm hover:text-foreground transition-colors"
        >
          <span className="font-normal">Powered by </span>
          <span className="font-semibold">Launch Planner</span>
        </a>
      </div>
    </footer>
  );
};

export default Footer;
