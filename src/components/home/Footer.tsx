import { Link } from "@tanstack/react-router";

const Footer = () => {
  return (
    <footer className="bg-muted/50 border-t border-border">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <nav aria-label="Footer" className="flex items-center gap-6">
            <Link
              to="/privacy"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms &amp; Conditions
            </Link>
            <Link
              to="/data-deletion"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Data Deletion Policy
            </Link>
          </nav>
          <a
            href="https://www.projectprofile.agency"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Powered by Project Profile
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
