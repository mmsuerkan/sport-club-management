# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SuperClaude is a configuration framework that enhances Claude Code with specialized commands, cognitive personas, and development methodologies. It's a v2.0.0 framework built around an @include template system for configuration management.

## Architecture

### Core Structure
- **Template-based architecture**: Uses @include references to eliminate ~70% configuration duplication
- **18 specialized commands** in `.claude/commands/` covering development lifecycle
- **9 cognitive personas** available as universal flags (--persona-architect, --persona-security, etc.)
- **4 core configuration files** in `.claude/shared/`: superclaude-core.yml, superclaude-personas.yml, superclaude-mcp.yml, superclaude-rules.yml
- **21 shared pattern files** in `.claude/commands/shared/` for reusable configurations

### Key Components
- **CLAUDE.md**: Main configuration entry point using @include references
- **install.sh**: Enterprise-grade installer (1,856 lines) with backup, update, and rollback capabilities
- **Universal constants**: Single source of truth for symbols, abbreviations, and standards in `.claude/commands/shared/universal-constants.yml`
- **Flag inheritance system**: Universal flags available across all commands in `.claude/commands/shared/flag-inheritance.yml`

## Common Commands

### Installation & Setup
```bash
# Install SuperClaude framework
./install.sh                    # Basic installation to ~/.claude/
./install.sh --update          # Update existing installation, preserve customizations  
./install.sh --dry-run         # Preview changes before applying
./install.sh --verify-checksums # Integrity verification
```

### Development Commands
```bash
# Project building with stack templates
/build --react --magic         # React app with UI generation
/build --api --c7              # API with documentation lookup
/build --feature --tdd         # Feature implementation with test-driven development

# Testing framework
/test --coverage               # Generate coverage reports
/test --e2e --pup             # End-to-end tests with Puppeteer
/test --integration           # Integration test suite

# Environment setup
/dev-setup --ci --monitor     # CI environment with monitoring
```

### Analysis & Quality Commands
```bash
# Multi-dimensional analysis
/analyze --code --persona-architect    # Code review with systems thinking
/analyze --security --persona-security # Security analysis with threat modeling
/analyze --architecture --seq          # System analysis with sequential reasoning

# Issue resolution
/troubleshoot --prod --five-whys       # Production debugging with root cause analysis
/troubleshoot --investigate --persona-analyzer # Deep investigation approach
```

### Operations Commands
```bash
# Deployment
/deploy --env prod --plan      # Production deployment planning
/deploy --staging --rollback   # Staging deployment with rollback capability

# Security & validation
/scan --security --owasp --deps # OWASP security audit with dependency scanning
/scan --validate --persona-security # Validation with security focus

# Maintenance
/cleanup --all --validate      # Project cleanup with validation
/migrate --dry-run --rollback  # Database migration with dry-run
```

## Cognitive Personas (Universal Flags)

All personas are available as flags on any command:
- **--persona-architect**: Systems thinking, long-term maintainability, DDD patterns
- **--persona-security**: Security-first analysis, OWASP compliance, threat modeling
- **--persona-frontend**: UX-focused development, accessibility, performance optimization
- **--persona-backend**: Server systems, scalability, API design
- **--persona-analyzer**: Problem-solving, debugging, root cause analysis
- **--persona-qa**: Quality assurance, comprehensive testing, edge cases
- **--persona-performance**: Optimization, bottleneck analysis, efficiency
- **--persona-refactorer**: Code quality, maintainability, technical debt reduction
- **--persona-mentor**: Knowledge sharing, documentation, best practices

## Universal Flags

Available on all commands via flag inheritance:
- **--think**: Standard analysis depth
- **--think-hard**: Deeper analysis
- **--ultrathink**: Maximum analysis depth
- **--uc**: UltraCompressed mode for token efficiency
- **--no-mcp**: Use native tools only
- **--plan**: Show implementation plan before execution
- **--seq**: Use Sequential MCP server for complex reasoning
- **--c7**: Use Context7 MCP server for documentation lookup
- **--magic**: Use Magic MCP server for UI component generation
- **--pup**: Use Puppeteer MCP server for browser automation

## Development Standards

### Philosophy
- **Code > docs**: Prioritize working code over extensive documentation
- **Simple → complex**: Start simple, evolve to complexity as needed
- **Security → evidence → quality**: Security first, evidence-based decisions, quality focus
- **Evidence-based approach**: Research requirements built into workflows

### Token Economy
- Uses @include template system for 70% configuration reduction
- Symbol-based communication: → (leads to), & (combine), | (separator), : (define)
- UltraCompressed mode available with --uc flag
- Context-aware compression based on token usage

### Quality Standards
- **Severity system**: CRITICAL→Block, HIGH→Warn, MEDIUM→Advise
- **Evidence requirements**: "testing confirms", "metrics show", "benchmarks prove"
- **Research standards**: Context7 for external libraries, official documentation required
- **Git safety**: Uncommitted changes warnings, branch validation, checkpoint suggestions

## MCP Integration

SuperClaude orchestrates multiple Model Context Protocol servers:
- **Context7**: Library documentation and API reference lookup
- **Sequential**: Complex problem-solving with multi-step reasoning
- **Magic**: AI-generated UI components and templates
- **Puppeteer**: Browser automation and end-to-end testing

Progressive escalation: Native tools → Context7 → Sequential → Multi-MCP based on complexity.

## File Organization

```
SuperClaude/
├── .claude/                    # Configuration framework
│   ├── commands/              # 18 specialized commands
│   │   ├── shared/           # 21 reusable pattern files
│   │   └── *.md             # Command definitions
│   └── shared/               # 4 core configuration files
├── install.sh                # Enterprise installer (1,856 lines)
├── CLAUDE.md                 # Main configuration (this file)
└── README.md                 # Project documentation
```

## Key Implementation Notes

1. **Template System**: The existing CLAUDE.md uses @include references that may not work with standard Claude Code. This updated version provides standalone guidance.

2. **Configuration Architecture**: The framework uses YAML-based templates with reference validation. Changes to shared files propagate across all commands.

3. **Evidence-Based Development**: All claims must be backed by evidence. Prohibited language includes "best", "optimal", "always". Required language includes "may", "typically", "measured".

4. **Installation Safety**: The install.sh script includes comprehensive security validation, backup management, and rollback capabilities. Always use --dry-run first for safety.

5. **Command Consistency**: All commands inherit universal flags and follow consistent patterns. The flag inheritance system eliminates ~400 lines of duplication.

## Version Information

- **SuperClaude Version**: 2.0.0
- **Architecture**: Template-based configuration with @include system
- **Commands**: 18 specialized development lifecycle commands
- **Personas**: 9 cognitive approaches integrated as universal flags
- **License**: MIT