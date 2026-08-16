export type CollaboratorRole = "owner" | "collaborator"

export interface Collaborator {
  id: string
  email: string
  name: string | null
  imageUrl: string | null
  role: CollaboratorRole
}
