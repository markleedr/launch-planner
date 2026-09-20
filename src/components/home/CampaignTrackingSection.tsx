import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { GetStartedButton } from "@/components/billing/get-started-button";
import { motion, type Variants } from "framer-motion";
import { Bell, Mail, MessageSquare, ArrowRight } from "lucide-react";

const floatSlow: Variants = {
  animate: {
    y: [0, -8, 0],
    transition: { duration: 4, repeat: Infinity, ease: "easeInOut" as const },
  },
};
const floatMedium: Variants = {
  animate: {
    y: [0, -12, 0],
    transition: { duration: 3.5, repeat: Infinity, ease: "easeInOut" as const },
  },
};
const floatFast: Variants = {
  animate: {
    y: [0, -6, 0],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const },
  },
};
const floatDrift: Variants = {
  animate: {
    x: [0, 4, 0],
    y: [0, -6, 0],
    transition: { duration: 5, repeat: Infinity, ease: "easeInOut" as const },
  },
};
const floatRotate: Variants = {
  animate: {
    y: [0, -10, 0],
    rotate: [0, 2, 0],
    transition: { duration: 4.5, repeat: Infinity, ease: "easeInOut" as const },
  },
};

const channelColors = {
  meta: "hsl(210, 100%, 56%)",
  google: "hsl(46, 97%, 54%)",
  rea: "hsl(142, 71%, 45%)",
  domain: "hsl(270, 60%, 60%)",
  email: "hsl(172, 66%, 50%)",
  sms: "hsl(330, 80%, 60%)",
};

export function CampaignTrackingSection() {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 bg-muted/30 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight text-foreground mb-6">
              escape the spreadsheet chaos<span className="text-brand">.</span>
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-lg">
              Generate detailed activity schedule, inclusion lists, and cost proposals by inputting
              your project details and deliverables.
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <GetStartedButton
                size="lg"
                className="w-full sm:w-auto text-base px-8 h-12 rounded-full font-semibold bg-brand text-brand-foreground hover:bg-brand/90"
              />
            </div>
          </div>

          <div className="relative min-h-[400px] sm:min-h-[480px]">
            <motion.div
              variants={floatDrift}
              animate="animate"
              className="absolute left-4 sm:left-8 top-4 sm:top-8 z-20"
            >
              <div className="bg-card rounded-full px-4 py-2 shadow-lg border border-border flex items-center gap-2">
                <Bell className="h-4 w-4 text-brand" />
                <span className="text-sm font-medium text-brand">Alerts</span>
              </div>
            </motion.div>

            <motion.div
              variants={floatMedium}
              animate="animate"
              className="absolute right-0 sm:right-4 top-0 z-20"
            >
              <div className="bg-card rounded-xl p-4 shadow-xl border border-border min-w-[140px]">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M22.5 12.5c0-5.5-4.5-10-10-10S2.5 7 2.5 12.5s4.5 10 10 10 10-4.5 10-10z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12.5 7.5L17 12l-4.5 4.5"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path d="M7 12h10" stroke="#FBBC05" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <span className="text-xs text-muted-foreground">Google Ads</span>
                </div>
                <p className="text-xl font-bold text-foreground">$113,521</p>
              </div>
            </motion.div>

            <motion.div
              className="absolute right-0 top-16 sm:top-20 z-10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-card rounded-xl shadow-2xl border border-border flex overflow-hidden">
                <div className="p-4 sm:p-5 min-w-[240px] sm:min-w-[280px] border-r border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                    <span className="font-semibold text-foreground text-sm">Media Schedule</span>
                  </div>
                  <div className="flex gap-2 mb-4">
                    <span className="px-3 py-1 text-xs font-medium bg-brand text-brand-foreground rounded-full">
                      Automatic
                    </span>
                    <span className="px-3 py-1 text-xs font-medium text-muted-foreground bg-muted rounded-full">
                      Manual
                    </span>
                  </div>
                  <div className="space-y-2">
                    {[
                      ["Meta Ads", "75%", channelColors.meta],
                      ["Google", "90%", channelColors.google],
                      ["REA", "60%", channelColors.rea],
                      ["Domain", "55%", channelColors.domain],
                      ["Email", "85%", channelColors.email],
                      ["SMS", "40%", channelColors.sms],
                    ].map(([label, width, color]) => (
                      <div key={label} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
                        <div className="flex-1 h-2.5 rounded-full overflow-hidden bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{ width, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 sm:p-5 min-w-[200px] sm:min-w-[240px] bg-muted/30">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="font-semibold text-foreground text-sm">Cost Breakdown</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    {[
                      ["Production", "$2,560"],
                      ["Implementation", "$25,074"],
                      ["Media", "$0"],
                      ["Contingency", "$1,382"],
                    ].map(([l, v]) => (
                      <div
                        key={l}
                        className="flex justify-between items-center py-1 border-b border-border/50"
                      >
                        <span className="text-muted-foreground">{l}</span>
                        <span className="font-medium text-foreground">{v}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 mt-1 border-t border-foreground/20">
                      <span className="font-semibold text-foreground">Total</span>
                      <span className="font-bold text-foreground">$29,016</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={floatSlow}
              animate="animate"
              className="absolute right-0 sm:right-8 top-32 sm:top-36 z-20"
            >
              <div className="bg-card rounded-xl p-4 shadow-xl border border-border min-w-[130px]">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"
                      fill="#0081FB"
                    />
                  </svg>
                  <span className="text-xs text-muted-foreground">Meta Ads</span>
                </div>
                <p className="text-xl font-bold text-foreground">$37,238</p>
              </div>
            </motion.div>

            <motion.div
              variants={floatFast}
              animate="animate"
              className="absolute left-4 sm:left-12 bottom-16 sm:bottom-20 z-20"
            >
              <div className="bg-card rounded-xl p-4 shadow-xl border border-border min-w-[120px]">
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="h-5 w-5" style={{ color: channelColors.email }} />
                  <span className="text-xs text-muted-foreground">Email</span>
                </div>
                <p className="text-xl font-bold text-foreground">$910</p>
              </div>
            </motion.div>

            <motion.div
              variants={floatRotate}
              animate="animate"
              className="absolute right-8 sm:right-16 bottom-4 sm:bottom-8 z-20"
            >
              <div className="bg-card rounded-full px-4 py-2 shadow-lg border border-border flex items-center gap-2">
                <MessageSquare className="h-4 w-4" style={{ color: channelColors.sms }} />
                <span className="text-sm font-medium" style={{ color: channelColors.sms }}>
                  SMS
                </span>
              </div>
            </motion.div>

            <motion.div
              variants={floatDrift}
              animate="animate"
              className="absolute left-0 top-1/2 z-20 hidden lg:block"
            >
              <div className="bg-card rounded-lg p-3 shadow-lg border border-border">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-red-500 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white">REA</span>
                  </div>
                  <span className="text-xs font-medium text-foreground">realestate.com.au</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={floatSlow}
              animate="animate"
              className="absolute right-32 sm:right-40 bottom-4 sm:bottom-8 z-20 hidden sm:block"
            >
              <div className="bg-card rounded-lg p-3 shadow-lg border border-border">
                <div className="flex items-center gap-2">
                  <div
                    className="h-6 w-6 rounded flex items-center justify-center"
                    style={{ backgroundColor: channelColors.domain }}
                  >
                    <span className="text-[8px] font-bold text-white">D</span>
                  </div>
                  <span className="text-xs font-medium text-foreground">Domain.com.au</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
