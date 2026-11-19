#!/usr/bin/env node
/** yak — yushe-agent-kit CLI entry (compiled to dist/bin/yak.js). */
import { run } from '../cli/main.js'

process.title = 'yak'
try {
  process.exitCode = await run()
} catch (error) {
  console.error(`yak: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
