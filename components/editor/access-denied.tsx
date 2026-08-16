import Link from "next/link"
import { Lock } from "lucide-react"

import { Button } from "@/components/ui/button"

export function AccessDenied() {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-3 px-4 text-center">
      <Lock className="size-8 text-muted-foreground" />
      <div className="flex flex-col gap-1.5">
        <h1 className="font-heading text-lg font-medium text-foreground">
          Access denied
        </h1>
        <p className="text-sm text-muted-foreground">
          This project does not exist, or you do not have access to it.
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href="/editor">Back to Editor</Link>
      </Button>
    </div>
  )
}
