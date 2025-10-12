# AGENTS.md - AI Coding Agent Instructions

This file provides standardized instructions for AI coding agents (Cursor, Claude Code, GitHub Copilot/Codex, etc.) to ensure consistent development practices across all projects.

## 🎯 Core Principles

### Development Philosophy
- **Simplicity First**: Prioritize clear, maintainable solutions; minimize unnecessary complexity
- **Follow Patterns**: Adhere to established patterns and architectural designs in the codebase
- **Propose Alternatives**: Only suggest different approaches when there's clear justification
- **Context Awareness**: Always read recent git commits and project structure before making changes

## 📝 Git Commit Message Standards

All commit messages **MUST** follow both [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) and [Gitmoji](https://gitmoji.dev/) standards.

### Format Structure

```
<gitmoji> <type>[optional scope]: <description>

[optional body with bullet points]

[optional footer(s)]
```

### Commit Types

- **feat**: A new feature (correlates with MINOR in SemVer)
- **fix**: A bug fix (correlates with PATCH in SemVer)
- **docs**: Documentation only changes
- **style**: Code style changes (formatting, missing semi-colons, etc.)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **build**: Changes to build system or dependencies
- **ci**: Changes to CI/CD configuration
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

### Gitmoji Usage

Use appropriate gitmoji at the start of commit messages:
- ✨ `:sparkles:` - New feature
- 🐛 `:bug:` - Bug fix
- 📝 `:memo:` - Documentation
- 🎨 `:art:` - Code style/structure improvement
- ⚡️ `:zap:` - Performance improvement
- 🔥 `:fire:` - Remove code or files
- 🚀 `:rocket:` - Deploy/release
- 🔧 `:wrench:` - Configuration files
- ✅ `:white_check_mark:` - Tests
- 🔒 `:lock:` - Security fixes
- ⬆️ `:arrow_up:` - Upgrade dependencies
- ⬇️ `:arrow_down:` - Downgrade dependencies
- 🔀 `:twisted_rightwards_arrows:` - Merge branches

[See full list at gitmoji.dev](https://gitmoji.dev/)

### Commit Message Guidelines

1. **Subject Line (First Line)**:
   - Start with appropriate gitmoji
   - Follow with conventional commit type
   - Use imperative mood ("add" not "added" or "adds")
   - Keep under 72 characters
   - No period at the end
   - Be descriptive but concise

2. **Body (Optional but Recommended)**:
   - Separate from subject with blank line
   - Use bullet points for multiple changes
   - Explain **what** and **why**, not **how**
   - Wrap at 72 characters
   - Reference issues/tickets when applicable

3. **Footer (Optional)**:
   - Reference breaking changes: `BREAKING CHANGE: description`
   - Reference issues: `Closes #123` or `Refs #456`
   - Add co-authors: `Co-authored-by: Name <email>`

### Commit Message Examples

#### ✅ Good Examples

```
✨ feat(auth): add OAuth2 authentication flow

- Implement Google OAuth2 provider
- Add JWT token generation and validation
- Create middleware for protected routes
- Add refresh token rotation

Closes #142
```

```
🐛 fix(api): prevent race condition in request handling

- Introduce request ID tracking
- Add reference to latest request
- Dismiss responses from outdated requests
- Remove obsolete timeout mitigation

This fixes intermittent 500 errors reported in production.

Refs #287
```

```
📝 docs: update API documentation for v2 endpoints
```

```
🔧 chore(deps): upgrade TypeScript to 5.3.0
```

#### ❌ Bad Examples

```
# Too vague, no gitmoji, no type
Updated files
```

```
# No gitmoji, unclear what changed
fix: fixed bug
```

```
# Past tense instead of imperative
feat: Added new feature
```

## 🔍 Pre-Commit Checks

**CRITICAL**: Before suggesting or creating any commit, AI agents MUST:

1. **Read Recent Commits**: Check the last 5-10 commits in the repository
2. **Analyze Patterns**: Understand the existing commit message style
3. **Validate Compliance**: Ensure proposed commit follows the standards above
4. **Warn on Deviation**: If the proposed commit would break the established pattern, **STOP and ASK** the user before proceeding

### Check Command

```bash
git log --oneline -10
```

### Warning Example

If you detect that a proposed commit doesn't match the standard:

```
⚠️ WARNING: Commit Message Standard Check

I've reviewed the recent commits and noticed they follow Conventional Commits + Gitmoji format.
However, my proposed commit message might not match this pattern.

Recent commits:
- ✨ feat(wallet): add transaction history endpoint
- 🐛 fix(auth): resolve token expiration issue
- 📝 docs: update README with API examples

Proposed commit:
[Your proposed commit message]

Would you like me to:
1. Revise the commit message to match the pattern
2. Proceed with the current message
3. Let you write the commit message manually
```

## 📦 Pull Request Standards

Pull requests should follow similar quality standards:

### PR Title Format

```
<gitmoji> <type>: <description>
```

### PR Description Template

```markdown
## 🎯 Purpose
Brief description of what this PR accomplishes

## 🔄 Changes
- Bullet point list of key changes
- Keep it concise but descriptive
- Link related issues

## 🧪 Testing
- How was this tested?
- What test cases were added/updated?

## 📸 Screenshots (if applicable)
[Add screenshots for UI changes]

## ✅ Checklist
- [ ] Code follows project style guidelines
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] No breaking changes (or documented if unavoidable)
- [ ] Reviewed own code before requesting review

## 🔗 Related Issues
Closes #123
Refs #456
```

## 🚫 Important Don'ts

1. **Never commit** without checking recent commit patterns first
2. **Never use** generic messages like "update", "fix", "changes"
3. **Never skip** the commit type and gitmoji
4. **Never commit** sensitive information (API keys, passwords, tokens)
5. **Never force push** to main/master without explicit user permission
6. **Never skip hooks** (--no-verify) unless explicitly requested

## 💡 Code Quality Standards

- **TypeScript**: Prefer TypeScript over JavaScript for new files
- **Testing**: All new features should include tests
- **Linting**: Fix linter errors before committing
- **Comments**: Add comments for complex logic, but prefer self-documenting code
- **Functions**: Keep functions small and focused (Single Responsibility Principle)
- **Naming**: Use descriptive names for variables, functions, and classes

## 🔒 Security Practices

- Never log sensitive information
- Validate and sanitize all user inputs
- Use parameterized queries to prevent SQL injection
- Implement proper authentication and authorization
- Keep dependencies updated
- Follow OWASP Top 10 guidelines

## 📚 Additional Resources

- [Conventional Commits Specification](https://www.conventionalcommits.org/en/v1.0.0/)
- [Gitmoji - Emoji Guide for Commits](https://gitmoji.dev/)
- [Semantic Versioning](https://semver.org/)
- [Git Trailer Format](https://git-scm.com/docs/git-interpret-trailers)

---

**Last Updated**: 2025-10-12
**Applies To**: All projects using this AGENTS.md file

