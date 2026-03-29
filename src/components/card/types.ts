export interface SpecFileItem {
  filePath: string
  isNew: boolean
  content?: string
}

export interface MockupFileItem {
  filePath: string
  content?: string
}

export interface ProjectSpecItem {
  filePath: string
  content: string
}
