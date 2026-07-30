#!/usr/bin/env node
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'

const ignoredDirectories = new Set(['node_modules', 'dist', '.git', 'docs'])
const terms = [
  /xe\s*kh[ôo]/giu,
  /ch[ữu]a\s*l[àa]nh/giu,
  /cafe\s+companion(?:\s+pos)?/giu,
  /firebaseConfig/giu,
  /\bauthDomain\s*:/giu,
  /\bapiKey\s*:/giu,
  /\bprojectId\s*:/giu,
  /AIza/gu,
  /973225282530124/gu,
]

async function files(path) {
  try {
    const info = await stat(path)
    if (info.isFile()) return [path]
    if (!info.isDirectory()) {
      const error = new Error('SCAN_ROOT_NOT_DIRECTORY')
      error.code = 'SCAN_ROOT_NOT_DIRECTORY'
      throw error
    }
    const entries = await readdir(path, { withFileTypes: true })
    return (await Promise.all(entries
      .filter((entry) => !(entry.isDirectory() && ignoredDirectories.has(entry.name)))
      .filter((entry) => !(entry.isFile() && entry.name === 'package-lock.json'))
      .map((entry) => files(join(path, entry.name))))).flat()
  } catch (error) {
    error.scanPath ??= path
    throw error
  }
}

export async function scan(paths, cwd = process.cwd()) {
  const findings = []
  for (const path of (await Promise.all(paths.map(files))).flat()) {
    let lines
    try {
      lines = (await readFile(path, 'utf8')).split(/\r?\n/)
    } catch (error) {
      error.scanPath ??= path
      throw error
    }
    lines.forEach((line, index) => {
      for (const term of terms) {
        term.lastIndex = 0
        for (const match of line.matchAll(term)) findings.push(`${relative(cwd, path)}:${index + 1}:${match[0]}`)
      }
    })
  }
  return findings
}

function scanError(path, error, cwd = process.cwd()) {
  const safePath = relative(cwd, path) || '.'
  console.error(`SCAN_ERROR ${safePath} ${error?.code ?? 'UNKNOWN'}`)
  process.exitCode = 1
}

async function validateDirectory(path) {
  const info = await stat(path)
  if (!info.isDirectory()) {
    const error = new Error('SCAN_ROOT_NOT_DIRECTORY')
    error.code = 'SCAN_ROOT_NOT_DIRECTORY'
    throw error
  }
}

async function selfTest() {
  const fixture = await mkdtemp(join(tmpdir(), 'scan-leakage-'))
  try {
    await writeFile(join(fixture, 'source.js'), 'const apiKey: "AIza-test"\n')
    await writeFile(join(fixture, 'clean.js'), 'const product = "Small POS"\n')
    await writeFile(join(fixture, 'package-lock.json'), 'const apiKey: "AIza-test"\n')
    for (const directory of ignoredDirectories) {
      const path = join(fixture, directory)
      await mkdir(path)
      await writeFile(join(path, 'leaky.js'), 'const apiKey: "AIza-test"\n')
    }
    const lockDirectory = join(fixture, 'package-lock-directory', 'package-lock.json')
    await mkdir(lockDirectory, { recursive: true })
    await writeFile(join(lockDirectory, 'leaky.js'), 'const apiKey: "AIza-test"\n')

    assert.deepEqual(await scan([join(fixture, 'source.js')], fixture), ['source.js:1:apiKey:', 'source.js:1:AIza'])
    assert.deepEqual(await scan([join(fixture, 'clean.js')], fixture), [])
    assert.deepEqual(await scan([fixture], fixture), [
      'package-lock-directory/package-lock.json/leaky.js:1:apiKey:',
      'package-lock-directory/package-lock.json/leaky.js:1:AIza',
      'source.js:1:apiKey:',
      'source.js:1:AIza',
    ])
  } finally {
    await rm(fixture, { recursive: true, force: true })
  }
}

async function main() {
  const requiredRoots = ['src', 'public']
  const requiredFiles = ['package.json', 'vite.config.ts']

  try {
    await Promise.all(requiredRoots.map(validateDirectory))
    const tsconfigs = (await readdir('.', { withFileTypes: true }))
      .filter((entry) => entry.isFile() && /^tsconfig.*\.json$/.test(entry.name))
      .map((entry) => entry.name)
    const findings = await scan([...requiredRoots, ...requiredFiles, ...tsconfigs])
    if (findings.length) {
      console.error(findings.join('\n'))
      process.exitCode = 1
    }
  } catch (error) {
    scanError(error?.scanPath ?? error?.path ?? '.', error)
  }
}

if (process.argv[2] === '--self-test') {
  await selfTest()
} else {
  await main()
}
