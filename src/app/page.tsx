import Link from "next/link";
import { LinkButton } from "@/components/ui/link-button";
import { Routes } from "@/constants";
import { Vote, ShieldCheck, BarChart3, Lock } from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Secure & Auditable",
    description: "Every action is logged with full audit trails for transparency and accountability.",
  },
  {
    icon: Lock,
    title: "Anonymous Ballots",
    description: "Your vote is cryptographically separated from your identity to ensure privacy.",
  },
  {
    icon: BarChart3,
    title: "Live Results",
    description: "Real-time turnout and published results when elections close.",
  },
];

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
      <div className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-0 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between border-b border-border/50 bg-background/80 px-6 py-4 backdrop-blur-md">
        <Link href={Routes.HOME} className="text-3xl font-extrabold tracking-tight hover:text-primary transition-colors flex items-center">
          <img src="/favicon.ico" alt="CU Logo" className="h-6 w-6" />
          <span className="text-primary">CU</span><span className="text-[oklch(0.769_0.159_43)]">Vote</span>
        </Link>
        <LinkButton href={Routes.LOGIN} variant="outline" size="sm">
          Sign In
        </LinkButton>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="container mx-auto flex max-w-5xl flex-col items-center gap-8 text-center">
          <div className="rounded-full bg-primary/10 p-5 ring-1 ring-primary/20">
            <Vote className="h-12 w-12 text-primary" />
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Covenant University
              <br />
              <span className="bg-gradient-to-r from-primary to-gold bg-clip-text text-transparent">
                E-Voting Portal
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Secure, transparent, and auditable elections. Cast your vote seamlessly and shape the future of your department.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <LinkButton href={Routes.LOGIN} size="lg" className="h-12 px-8">
              Secure Login
            </LinkButton>
            <LinkButton href={Routes.DASHBOARD} variant="outline" size="lg" className="h-12 px-8">
              Go to Dashboard
            </LinkButton>
          </div>

          <div className="mt-12 grid w-full gap-6 sm:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-xl border border-border/50 bg-card/50 p-6 text-left shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-2.5">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 font-semibold">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-border/50 bg-background/80 px-6 py-4 text-center text-sm text-muted-foreground backdrop-blur-md">
        © {new Date().getFullYear()} Covenant University · CUVote Electronic Voting System
      </footer>
    </div>
  );
}
