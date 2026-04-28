export interface Demo {
  id: string
  name: string
  description: string
  code: string
  frameworks?: {
    vue?: string
    react?: string
    vanilla?: string
  }
}
