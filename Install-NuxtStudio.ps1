
#Requires -Version 7.0
<#
.SYNOPSIS
    Safely install and test Nuxt Studio in an existing Nuxt project.

.DESCRIPTION
    - Validates the project and required tools
    - Detects the package manager
    - Inspects Nuxt and Nuxt Content dependencies
    - Requires a clean Git working tree
    - Creates a separate test branch
    - Installs Nuxt Studio using the official Nuxt CLI
    - Starts the local development server
    - Never deploys to Cloudflare

.EXAMPLE
    .\Install-NuxtStudio.ps1 -ProjectPath "D:\Projects\my-nuxt-site"

.EXAMPLE
    .\Install-NuxtStudio.ps1
    # Uses the current directory
#>

[CmdletBinding()]
param(
    [string]$ProjectPath = (Get-Location).Path,
    [string]$BranchName = "test/nuxt-studio",
    [switch]$SkipDevServer
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step {
    param([string]$Message)
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Write-OK {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Assert-Command {
    param([string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found in PATH."
    }
}

function Invoke-Checked {
    param(
        [string]$Executable,
        [string[]]$Arguments
    )

    & $Executable @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "$Executable failed with exit code $LASTEXITCODE."
    }
}

$originalLocation = (Get-Location).Path
$branchCreated = $false

try {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host "       NUXT STUDIO LOCAL TEST" -ForegroundColor Magenta
    Write-Host "========================================" -ForegroundColor Magenta

    # --------------------------------------------------
    # 1. Verify required tools
    # --------------------------------------------------

    Write-Step "Checking development environment"

    foreach ($tool in @("git", "node", "npm", "npx")) {
        Assert-Command $tool
    }

    Write-OK "Git, Node.js, npm and npx found"

    $nodeVersion = (& node --version).Trim()
    $npmVersion = (& npm --version).Trim()

    Write-Host "Node.js: $nodeVersion"
    Write-Host "npm:     $npmVersion"

    $nodeMajor = [int](
        $nodeVersion.TrimStart("v").Split(".")[0]
    )

    if ($nodeMajor -lt 20) {
        throw "Node.js 20 or newer is required for this test."
    }

    # --------------------------------------------------
    # 2. Locate and validate Nuxt project
    # --------------------------------------------------

    Write-Step "Inspecting Nuxt project"

    $ProjectPath = (
        Resolve-Path -LiteralPath $ProjectPath
    ).Path

    Set-Location -LiteralPath $ProjectPath

    if (-not (Test-Path -LiteralPath "package.json")) {
        throw "No package.json found in $ProjectPath."
    }

    $package = Get-Content "package.json" -Raw |
        ConvertFrom-Json

    $allDependencies = @{}

    foreach ($section in @("dependencies", "devDependencies")) {
        $property = $package.PSObject.Properties[$section]

        if ($null -ne $property -and $null -ne $property.Value) {
            foreach ($item in $property.Value.PSObject.Properties) {
                $allDependencies[$item.Name] = $item.Value
            }
        }
    }

    if (-not $allDependencies.ContainsKey("nuxt")) {
        throw "This does not appear to be a Nuxt project."
    }

    Write-OK "Nuxt project detected"
    Write-Host "Directory: $ProjectPath"
    Write-Host "Nuxt dependency: $($allDependencies['nuxt'])"

    # --------------------------------------------------
    # 3. Detect package manager
    # --------------------------------------------------

    Write-Step "Detecting package manager"

    $packageManager = "npm"

    if (Test-Path "pnpm-lock.yaml") {
        $packageManager = "pnpm"
    }
    elseif (Test-Path "yarn.lock") {
        $packageManager = "yarn"
    }
    elseif (
        (Test-Path "bun.lock") -or
        (Test-Path "bun.lockb")
    ) {
        $packageManager = "bun"
    }

    Assert-Command $packageManager

    Write-OK "Package manager: $packageManager"

    # --------------------------------------------------
    # 4. Inspect Nuxt Content
    # --------------------------------------------------

    Write-Step "Checking Nuxt Content compatibility"

    $hasNuxtContent = $allDependencies.ContainsKey(
        "@nuxt/content"
    )

    if ($hasNuxtContent) {
        Write-OK "Nuxt Content dependency found"
        Write-Host (
            "Version: " + $allDependencies["@nuxt/content"]
        )
    }
    else {
        Write-Warn "Nuxt Content is not installed."
        Write-Warn (
            "Studio cannot automatically edit existing " +
            "Storyblok-driven or hardcoded Vue pages."
        )

        Write-Host ""
        Write-Host (
            "The installation can still be tested, but " +
            "Nuxt Content must be integrated first."
        )

        $answer = Read-Host (
            "Install @nuxt/content for this test? (y/N)"
        )

        if ($answer -notmatch "^[Yy]$") {
            throw (
                "Stopped before changing project files. " +
                "Nuxt Content installation was declined."
            )
        }
    }

    # --------------------------------------------------
    # 5. Validate Git repository
    # --------------------------------------------------

    Write-Step "Checking Git repository"

    & git rev-parse --is-inside-work-tree 2>$null |
        Out-Null

    if ($LASTEXITCODE -ne 0) {
        throw (
            "This project is not a Git repository. " +
            "Initialize Git and commit your project first."
        )
    }

    $gitRoot = (& git rev-parse --show-toplevel).Trim()
    $gitRoot = (Resolve-Path -LiteralPath $gitRoot).Path

    if (
        $gitRoot.TrimEnd('\', '/') -ne
        $ProjectPath.TrimEnd('\', '/')
    ) {
        throw (
            "The project is inside a larger Git repository. " +
            "Run the test from an isolated project checkout."
        )
    }

    $status = & git status --porcelain

    if ($status) {
        Write-Warn "Uncommitted or untracked files detected."
        & git status --short

        throw (
            "Commit, stash, or otherwise protect these files " +
            "before running the installer."
        )
    }

    Write-OK "Git working tree is clean"

    # --------------------------------------------------
    # 6. Create isolated test branch
    # --------------------------------------------------

    Write-Step "Creating isolated test branch"

    $currentBranch = (
        & git branch --show-current
    ).Trim()

    Write-Host "Original branch: $currentBranch"

    & git show-ref --verify --quiet (
        "refs/heads/" + $BranchName
    )

    if ($LASTEXITCODE -eq 0) {
        throw (
            "Branch '$BranchName' already exists. " +
            "Specify another name using -BranchName."
        )
    }

    Invoke-Checked "git" @(
        "switch",
        "-c",
        $BranchName
    )

    $branchCreated = $true

    Write-OK "Created branch: $BranchName"

    # --------------------------------------------------
    # 7. Install Nuxt Content if authorized
    # --------------------------------------------------

    if (-not $hasNuxtContent) {
        Write-Step "Installing Nuxt Content"

        switch ($packageManager) {
            "npm" {
                Invoke-Checked "npm" @(
                    "install", "@nuxt/content"
                )
            }
            "pnpm" {
                Invoke-Checked "pnpm" @(
                    "add", "@nuxt/content"
                )
            }
            "yarn" {
                Invoke-Checked "yarn" @(
                    "add", "@nuxt/content"
                )
            }
            "bun" {
                Invoke-Checked "bun" @(
                    "add", "@nuxt/content"
                )
            }
        }

        Write-OK "Nuxt Content dependency installed"

        Write-Warn (
            "Verify that @nuxt/content is registered in " +
            "nuxt.config.ts if the installer does not add it."
        )
    }

    # --------------------------------------------------
    # 8. Install Nuxt Studio
    # --------------------------------------------------

    Write-Step "Installing open-source Nuxt Studio"

    # npx forwards .npmrc settings as environment variables. npm 11.19
    # rejects inherited allow-scripts during the CLI's nested npm install.
    $nuxtExecutable = Join-Path $ProjectPath "node_modules/.bin/nuxt"
    if ($IsWindows) {
        $nuxtExecutable += ".cmd"
    }

    if (-not (Test-Path -LiteralPath $nuxtExecutable -PathType Leaf)) {
        throw "The project's Nuxt CLI is missing. Install project dependencies first."
    }

    Write-Host (
        "Using project Nuxt CLI: " +
        "$nuxtExecutable module add nuxt-studio"
    )

    Invoke-Checked $nuxtExecutable @(
        "module",
        "add",
        "nuxt-studio"
    )

    Write-OK "Nuxt Studio installation command completed"

    # --------------------------------------------------
    # 9. Show changes
    # --------------------------------------------------

    Write-Step "Reviewing project changes"

    & git status --short

    Write-Host ""
    Write-Host "Changes are isolated to:" -ForegroundColor Green
    Write-Host "  $BranchName"

    Write-Host ""
    Write-Host "No commits or deployments were made."

    # --------------------------------------------------
    # 10. Launch development server
    # --------------------------------------------------

    if ($SkipDevServer) {
        Write-OK "Installation finished"
        Write-Host "Development server skipped."
        return
    }

    Write-Step "Starting local Nuxt development server"

    Write-Host ""
    Write-Host "Open the local URL printed below." -ForegroundColor Cyan
    Write-Host "Typical address: http://localhost:3000"
    Write-Host "Open Studio using the floating editor button on the site."
    Write-Host ""
    Write-Host "Press Ctrl+C to stop the server."
    Write-Host ""

    switch ($packageManager) {
        "npm" {
            & npm run dev
        }
        "pnpm" {
            & pnpm dev
        }
        "yarn" {
            & yarn dev
        }
        "bun" {
            & bun run dev
        }
    }

    if ($LASTEXITCODE -ne 0) {
        throw (
            "Nuxt development server exited with code " +
            $LASTEXITCODE
        )
    }
}
catch {
    Write-Host ""
    Write-Host "INSTALLATION OR TEST STOPPED" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red

    if ($branchCreated) {
        Write-Warn (
            "The test branch was preserved for inspection. " +
            "No automatic rollback was attempted."
        )
    }

    exit 1
}
finally {
    Set-Location -LiteralPath $originalLocation
}
