import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CreditCard,
  ShieldCheck,
  TrendingUp,
  Zap,
  Store,
  LineChart,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Zap,
    title: "Real-Time POS Data",
    description:
      "Connect to VNPay, Momo, ZaloPay and bank POS systems. Ingest real-time merchant sales data for continuous credit monitoring.",
  },
  {
    icon: BarChart3,
    title: "AI Credit Scoring",
    description:
      "Qwen AI analyzes transaction patterns, revenue trends, and customer behavior to generate dynamic credit scores (0-1000).",
  },
  {
    icon: ShieldCheck,
    title: "Explainable Risk Assessment",
    description:
      "Color-coded risk factors (red/green/yellow) with AI-generated narratives explain every credit decision for compliance.",
  },
  {
    icon: CreditCard,
    title: "Pre-Approved Credit Limits",
    description:
      "Automatically calculate and offer pre-approved credit limits based on real business performance, not static financials.",
  },
  {
    icon: Bot,
    title: "AI Credit Co-Pilot",
    description:
      "Interactive chat assistant powered by Qwen AI. Ask questions about any merchant's profile, run what-if scenarios.",
  },
  {
    icon: TrendingUp,
    title: "Portfolio Intelligence",
    description:
      "Monitor your entire SME lending portfolio with real-time alerts, risk distribution, and performance dashboards.",
  },
];

const stats = [
  { value: "5x", label: "Faster credit decisions" },
  { value: "30%+", label: "Higher approval rates" },
  { value: "247", label: "Merchants assessed" },
  { value: "12.5B", label: "VND portfolio value" },
];

const steps = [
  {
    step: "01",
    icon: Store,
    title: "Connect POS Data",
    description: "Merchant connects their POS terminal or payment platform. We ingest real-time sales data automatically.",
  },
  {
    step: "02",
    icon: LineChart,
    title: "AI Analyzes Performance",
    description: "Qwen AI processes transaction patterns, revenue trends, customer behavior, and industry benchmarks.",
  },
  {
    step: "03",
    icon: CreditCard,
    title: "Get Credit Decision",
    description: "Receive instant credit score, risk grade, pre-approved limit, and full AI explanation — in minutes, not weeks.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0046FF] text-white font-bold text-sm">
              CM
            </div>
            <span className="text-lg font-bold tracking-tight">CreditMind AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it Works</a>
            <a href="#impact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Impact</a>
          </div>
          <Link href="/dashboard">
            <Button className="bg-[#0046FF] hover:bg-[#0035CC]">
              Open Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDQ2RkYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE4YzAtOS45NC04LjA2LTE4LTE4LTE4UzAgOC4wNiAwIDE4czguMDYgMTggMTggMTggMTgtOC4wNiAxOC0xOHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#0046FF]/20 bg-[#0046FF]/5 px-4 py-1.5">
              <Globe className="h-4 w-4 text-[#0046FF]" />
              <span className="text-sm font-medium text-[#0046FF]">
                Shinhan Bank × Qwen AI Build Day (SB09)
              </span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              One Dashboard.{" "}
              <span className="bg-gradient-to-r from-[#0046FF] to-[#0080FF] bg-clip-text text-transparent">
                Zero Guesswork.
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              AI-Driven SME Credit Scoring via POS Data. Transform real-time merchant
              sales data into instant, explainable credit decisions — enabling faster,
              data-driven lending without traditional financial statements.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/dashboard">
                <Button size="lg" className="bg-[#0046FF] hover:bg-[#0035CC] h-12 px-8 text-base">
                  Explore Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                  See Features
                </Button>
              </a>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-20 grid grid-cols-2 gap-4 sm:grid-cols-4 mx-auto max-w-3xl">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-xl border bg-white/80 backdrop-blur p-4 text-center shadow-sm">
                <p className="text-2xl font-extrabold text-[#0046FF]">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight">Benefits & Features</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              One platform that aggregates POS data, highlights risks with AI, and
              integrates with Shinhan Bank for faster, smarter SME lending decisions.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border bg-card p-6 transition-all hover:shadow-lg hover:border-[#0046FF]/20"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0046FF]/10 text-[#0046FF] transition-colors group-hover:bg-[#0046FF] group-hover:text-white">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight">How It Works</h2>
            <p className="mt-4 text-muted-foreground">
              From POS data to credit decision in three simple steps.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.step} className="relative">
                {i < steps.length - 1 && (
                  <div className="absolute top-12 left-[calc(50%+40px)] right-[calc(-50%+40px)] hidden md:block">
                    <div className="h-px w-full bg-[#0046FF]/20" />
                    <ArrowRight className="absolute -right-2 -top-2 h-4 w-4 text-[#0046FF]/30" />
                  </div>
                )}
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-6">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#0046FF] text-white shadow-lg shadow-[#0046FF]/20">
                      <step.icon className="h-9 w-9" />
                    </div>
                    <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white border-2 border-[#0046FF] text-xs font-bold text-[#0046FF]">
                      {step.step}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-xs">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact / CTA */}
      <section id="impact" className="bg-gradient-to-br from-[#0046FF] to-[#0035CC] py-24 text-white">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Transforming SME Lending for Shinhan Bank
          </h2>
          <p className="mt-4 text-blue-100 max-w-2xl mx-auto">
            Enable faster credit decisions, unlock new customer segments, and build a
            data-driven SME lending portfolio — all powered by AI.
          </p>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div>
              <p className="text-4xl font-extrabold">5x</p>
              <p className="mt-2 text-sm text-blue-100">Faster credit assessment turnaround</p>
            </div>
            <div>
              <p className="text-4xl font-extrabold">30%+</p>
              <p className="mt-2 text-sm text-blue-100">Increase in SME loan approval rate</p>
            </div>
            <div>
              <p className="text-4xl font-extrabold">100%</p>
              <p className="mt-2 text-sm text-blue-100">Explainable AI decisions for compliance</p>
            </div>
          </div>
          <Link href="/dashboard" className="mt-12 inline-block">
            <Button
              size="lg"
              className="bg-white text-[#0046FF] hover:bg-blue-50 h-12 px-8 text-base font-semibold"
            >
              Try the Dashboard Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-8">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-[#0046FF] text-white text-xs font-bold">
              CM
            </div>
            <span className="text-sm font-semibold">SME CreditMind AI</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Built for Shinhan Bank × Qwen AI Build Day (SB09). Team: Matthew, Lucky, Xuyen.
          </p>
        </div>
      </footer>
    </div>
  );
}
