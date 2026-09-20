export function LegalContact() {
  return (
    <address className="not-italic">
      Launch Planner Pty Ltd · ABN 57 674 795 745
      <br />
      54/111 Eagle Street, Brisbane QLD 4000, Australia
      <br />
      <a
        className="font-medium text-foreground underline underline-offset-4"
        href="mailto:admin@launchplanner.com.au"
      >
        admin@launchplanner.com.au
      </a>
      {" · "}
      <a
        className="font-medium text-foreground underline underline-offset-4"
        href="tel:+61731321625"
      >
        07 3132 1625
      </a>
    </address>
  );
}
