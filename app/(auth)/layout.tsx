import { FileText, Ghost, Share2, Sparkles } from "lucide-react";

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI Architecture Generation",
    description:
      "Describe your system, AI maps it to nodes and edges on a live canvas.",
  },
  {
    icon: Share2,
    title: "Real-time Collaboration",
    description:
      "Live cursors, presence indicators, and shared node editing across your team.",
  },
  {
    icon: FileText,
    title: "Instant Spec Generation",
    description:
      "Export a complete Markdown technical spec directly from the canvas graph.",
  },
] as const;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full overflow-auto">
      <div className="hidden w-1/2 shrink-0 flex-col justify-center gap-10 border-r border-border bg-card px-16 lg:flex">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-md bg-accent-primary">
              <Ghost className="size-5 text-accent-primary-foreground" />
            </span>
            <span className="font-heading text-lg font-semibold text-foreground">
              Ghost AI
            </span>
          </div>
          <div className="flex flex-col gap-4">
            <h1 className="font-heading text-3xl font-bold text-balance text-foreground">
              Design systems at the speed of thought.
            </h1>
            <p className="text-sm text-muted-foreground">
              Describe your architecture in plain English. Ghost AI maps it
              to a shared canvas your whole team can refine in real time.
            </p>
          </div>
        </div>
        <ul className="flex flex-col gap-5">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent-primary/10">
                <Icon className="size-4 text-accent-primary" />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">
                  {title}
                </span>
                <span className="text-sm text-muted-foreground">
                  {description}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-1 items-center justify-center px-6">
        {children}
      </div>
    </div>
  );
}
