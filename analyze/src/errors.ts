export class GlossaryDatabaseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GlossaryDatabaseError'
  }
}

export class LingoConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LingoConfigurationError'
  }
}
