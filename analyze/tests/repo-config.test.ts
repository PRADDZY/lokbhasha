import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'


const repoRoot = path.resolve(process.cwd(), '..')
const analyzeDockerfilePath = path.join(repoRoot, 'analyze', 'Dockerfile')
const backendDockerfilePath = path.join(repoRoot, 'backend', 'Dockerfile')
const backendRequirementsPath = path.join(repoRoot, 'backend', 'requirements.txt')
const releaseWorkflowPath = path.join(repoRoot, '.github', 'workflows', 'release.yml')
const analyzePackagePath = path.join(repoRoot, 'analyze', 'package.json')

test('service Dockerfiles declare healthchecks', async () => {
  const [analyzeDockerfile, backendDockerfile] = await Promise.all([
    readFile(analyzeDockerfilePath, 'utf8'),
    readFile(backendDockerfilePath, 'utf8'),
  ])

  assert.match(analyzeDockerfile, /HEALTHCHECK/)
  assert.match(backendDockerfile, /HEALTHCHECK/)
})

test('release workflow uses tag pushes instead of workflow_dispatch inputs', async () => {
  const releaseWorkflow = await readFile(releaseWorkflowPath, 'utf8')

  assert.match(releaseWorkflow, /push:\s*\n\s*tags:\s*\[\s*['"]v\*['"]\s*\]/)
  assert.doesNotMatch(releaseWorkflow, /workflow_dispatch:/)
  assert.doesNotMatch(releaseWorkflow, /inputs:/)
})

test('backend requirements pin a patched Pillow release', async () => {
  const backendRequirements = await readFile(backendRequirementsPath, 'utf8')
  assert.match(backendRequirements, /^Pillow==12\.1\.1$/m)
})

test('backend requirements pin a patched python-multipart release', async () => {
  const backendRequirements = await readFile(backendRequirementsPath, 'utf8')
  assert.match(backendRequirements, /^python-multipart==0\.0\.22$/m)
})

test('analyze package pins nested Next.js to a patched release for lingo.dev transitives', async () => {
  const analyzePackage = JSON.parse(await readFile(analyzePackagePath, 'utf8')) as {
    overrides?: Record<string, string>
  }

  assert.equal(analyzePackage.overrides?.next, '16.1.6')
})
