/** Shared installer contract; each target module implements it. */
export interface InstallOptions {
  copy?: boolean
  project?: string
  profile?: string
  plugin?: boolean
}

export interface Installer {
  install(opts: InstallOptions): Promise<string[]>
  update?(opts: InstallOptions): Promise<string[]>
  doctor(): string[]
}
