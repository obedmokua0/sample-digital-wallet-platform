<!--
SYNC IMPACT REPORT
==================
Version change: [Template] → 1.0.0
Change type: MINOR (Initial constitution creation)

Modified principles:
- NEW: TypeScript-First - Mandates TypeScript for all implementations
- NEW: Type Safety & Quality - Enforces strict typing and quality standards
- NEW: Test-First Development - Mandates TDD approach
- NEW: Simplicity & Maintainability - YAGNI and clarity principles
- NEW: Documentation Standards - Inline documentation requirements

Added sections:
- Core Principles (5 principles defined)
- Technology Stack (TypeScript ecosystem requirements)
- Development Workflow (TDD, reviews, quality gates)
- Governance (amendment and compliance procedures)

Templates requiring updates:
- ✅ .specify/templates/plan-template.md - Verified compatibility (Language/Version field supports TypeScript)
- ✅ .specify/templates/spec-template.md - Verified compatibility (technology-agnostic requirements)
- ✅ .specify/templates/tasks-template.md - Verified compatibility (language-agnostic task structure)
- ✅ .specify/templates/agent-file-template.md - Verified compatibility (language-agnostic template)
- ✅ .specify/templates/checklist-template.md - Verified compatibility (general checklist structure)

Follow-up TODOs:
- None - All placeholders resolved
-->

# SpecKit Constitution

## Core Principles

### I. TypeScript-First

**All project outputs MUST be implemented using TypeScript.**

This principle is non-negotiable and applies to:

- All application code (frontend, backend, scripts, tooling)
- All library implementations
- All CLI tools and utilities
- Configuration files where TypeScript is applicable (e.g., use .ts config files over .js)

**Rationale**: TypeScript provides compile-time type safety, improved developer experience through IDE support, better refactoring capabilities, and serves as living documentation through type definitions. Standardizing on TypeScript ensures consistency across the entire codebase and reduces cognitive overhead when switching between different parts of the system.

### II. Type Safety & Quality

**Strict typing and quality standards MUST be enforced throughout the codebase.**

Requirements:

- TypeScript strict mode MUST be enabled (`"strict": true` in tsconfig.json)
- No use of `any` type without explicit justification and eslint-disable comment
- All public APIs MUST have explicit type annotations
- All functions MUST have explicit return type annotations
- ESLint and Prettier MUST be configured and passing
- Type definitions MUST be provided for all external dependencies lacking them

**Rationale**: Strict typing catches errors at compile time rather than runtime, improves code maintainability, and serves as inline documentation. Quality tooling ensures consistent code style and catches common mistakes early.

### III. Test-First Development

**Test-Driven Development (TDD) MUST be followed for all feature implementations.**

The TDD cycle MUST be strictly enforced:

1. Write tests first based on requirements
2. Verify tests fail (Red)
3. Implement minimum code to pass tests (Green)
4. Refactor while keeping tests passing (Refactor)
5. Repeat

Test requirements:

- Tests MUST be written before implementation code
- All tests MUST initially fail to verify they test the right behavior
- Tests MUST use TypeScript and leverage type safety
- Integration tests MUST be provided for user stories
- Contract tests MUST be provided for all APIs and library interfaces

**Rationale**: TDD ensures code is testable, drives better design, provides living documentation of expected behavior, and catches regressions early. Writing tests first forces clarity about requirements before implementation begins.

### IV. Simplicity & Maintainability

**Code MUST prioritize simplicity, clarity, and maintainability over cleverness.**

Guidelines:

- YAGNI (You Aren't Gonna Need It) principle MUST be followed - implement only what is currently needed
- Complex abstractions MUST be justified in documentation
- Code MUST be self-documenting through clear naming and structure
- Premature optimization MUST be avoided
- Complexity that violates constitution principles MUST be tracked in the Complexity Tracking section of plan.md

**Rationale**: Simple code is easier to understand, maintain, debug, and extend. Complexity should only be introduced when there is a clear, documented need. The TypeScript type system already provides robust abstractions; additional complexity should be carefully considered.

### V. Documentation Standards

**Code MUST include appropriate inline documentation using TSDoc format.**

Documentation requirements:

- All exported functions, classes, and interfaces MUST have TSDoc comments
- TSDoc MUST include `@param` descriptions for all parameters
- TSDoc MUST include `@returns` descriptions for all return values
- TSDoc MUST include `@throws` descriptions for all thrown errors
- Complex algorithms or business logic MUST have explanatory comments
- README files MUST be provided at package/feature level with usage examples

**Rationale**: Inline TSDoc documentation integrates with IDE tooling to provide immediate context to developers, serves as a contract for API consumers, and ensures knowledge is preserved alongside the code it documents.

## Technology Stack

**Primary Language**: TypeScript (latest stable version)

**Required Tooling**:
- Node.js LTS version
- TypeScript compiler (tsc) with strict mode enabled
- ESLint with TypeScript plugin
- Prettier for code formatting
- Jest or Vitest for testing (with TypeScript support)
- ts-node or tsx for running TypeScript directly during development

**Package Management**: npm or pnpm (must be consistent across project)

**Build & Bundling**: Project-appropriate bundler (e.g., tsup, esbuild, webpack, vite) based on project type (library vs application)

**Type Checking**: Must pass `tsc --noEmit` with zero errors in CI/CD pipeline

## Development Workflow

### Test-Driven Development Process

1. **Requirements Clarification**: Ensure user story acceptance criteria are clear and testable
2. **Test Creation**: Write tests that verify acceptance criteria
3. **Test Validation**: Run tests to verify they fail appropriately
4. **Implementation**: Write minimum code to pass tests
5. **Refactoring**: Improve code quality while maintaining passing tests
6. **Review**: Code review must verify TDD process was followed

### Code Review Requirements

All code changes MUST pass review that verifies:
- TypeScript strict mode compliance (no type errors)
- Test-first development was followed (tests exist and pass)
- ESLint and Prettier pass without errors or warnings
- TSDoc documentation is complete for public APIs
- Constitution principles are followed

### Quality Gates

The following gates MUST pass before merging:
1. **Type Check**: `tsc --noEmit` passes with zero errors
2. **Linting**: ESLint passes with zero errors (warnings allowed with justification)
3. **Formatting**: Prettier check passes
4. **Tests**: All tests pass with appropriate coverage
5. **Constitution Check**: All principles verified (tracked in plan.md)

## Governance

### Amendment Procedure

Changes to this constitution require:
1. Documented rationale explaining why the change is needed
2. Impact analysis on existing code and practices
3. Migration plan if changes affect existing projects
4. Approval from project stakeholders
5. Version bump following semantic versioning rules

### Versioning Policy

Constitution versions follow semantic versioning:
- **MAJOR**: Backward-incompatible changes (e.g., changing required language, removing principles)
- **MINOR**: Additive changes (e.g., new principles, expanded guidelines)
- **PATCH**: Clarifications, typo fixes, non-semantic refinements

### Compliance Review

- All implementation plans (plan.md) MUST include a Constitution Check section
- Constitution violations MUST be explicitly justified in the Complexity Tracking section
- Regular audits SHOULD be conducted to ensure ongoing compliance
- This constitution supersedes all other development practices and guidelines

### Runtime Development Guidance

Project-specific runtime guidance is maintained in the auto-generated agent file based on active features and technologies. This guidance complements but does not override constitutional principles.

**Version**: 1.0.0 | **Ratified**: 2025-10-09 | **Last Amended**: 2025-10-09
