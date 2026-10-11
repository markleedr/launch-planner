import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { BOOKING_LABEL, BOOKING_URL } from "@/lib/leads/booking";

/** Secondary call to action shown once an email is captured. Opens the booking page in a new tab. */
export function BookingCta({ location }: { location: "pdf_export" | "info_toaster" }) {
  return (
    <Button asChild variant="outline" className="w-full">
      <a
        href={BOOKING_URL}
        target="_blank"
        rel="noopener"
        onClick={() => trackEvent("tud_booking_clicked", { location })}
      >
        <CalendarDays className="mr-2 size-4" aria-hidden />
        {BOOKING_LABEL}
      </a>
    </Button>
  );
}
