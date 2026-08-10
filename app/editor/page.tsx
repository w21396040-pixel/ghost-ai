import { NewProjectButton } from "@/components/editor/new-project-button"

export default function EditorPage() {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-heading text-lg font-medium text-foreground">
          Create a project or open an existing one
        </h1>
        <p className="text-sm text-muted-foreground">
          Start a new architecture workspace, or choose a project from the sidebar.
        </p>
      </div>
      <NewProjectButton />
    </div>
  )
}
