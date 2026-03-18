# Contributing to Anya

Thank you for your interest in contributing to Anya! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

Be respectful, inclusive, and professional. We're building a welcoming community for researchers and developers of all backgrounds.

## How to Contribute

### Reporting Bugs

1. **Search existing issues** to avoid duplicates
2. **Open a new issue** with:
   - Clear description of the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Your OS version and Anya version
   - Screenshots or error logs if relevant

### Suggesting Features

1. **Check existing issues** and discussions
2. **Open a feature request** with:
   - Clear use case and motivation
   - How it benefits researchers
   - Any API or design considerations

### Submitting Code

#### Setup

```bash
git clone https://github.com/yourusername/anya-ra.git
cd anya-ra
pnpm install
```

#### Development Workflow

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes**:
   - Keep commits atomic and well-documented
   - One feature/fix per pull request
   - Update tests for new functionality

3. **Test your changes**:
   ```bash
   pnpm test              # Run tests
   pnpm test:watch        # Watch mode
   pnpm tauri dev         # Test in dev environment
   pnpm tauri build       # Test production build
   ```

4. **Follow code style**:
   - **TypeScript**: Strict mode, no `any` without reason
   - **Rust**: Follow `clippy` lints, use `cargo fmt`
   - **Comments**: Only for non-obvious logic
   - **Naming**: Clear, descriptive names

5. **Commit with clear messages**:
   ```bash
   git commit -am "Add feature: brief description of what and why"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request** with:
   - Clear description of changes
   - Reference to related issues (#123)
   - Explanation of approach if not obvious
   - Any breaking changes

#### PR Guidelines

- **Size**: Keep PRs focused and reasonably sized
- **Tests**: All new features/fixes should have tests
- **Documentation**: Update docs if behavior changes
- **No merge conflicts**: Rebase before submitting
- **One approval**: At least one maintainer approval required

### Areas for Contribution

- **Frontend** (TypeScript/Svelte):
  - UI components and improvements
  - Performance optimizations
  - Test coverage
  - Documentation

- **Backend** (Rust):
  - Paper search integrations
  - PDF processing
  - Performance and memory usage
  - File I/O operations

- **Documentation**:
  - User guides
  - API documentation
  - Troubleshooting guides
  - Examples and tutorials

- **Quality**:
  - Bug fixes
  - Test coverage
  - Linting and formatting
  - Performance improvements

## Project Structure

```
anya-ra/
├── src/                      # Frontend (Svelte/TypeScript)
│   ├── lib/components/       # UI components
│   ├── lib/services/         # Business logic
│   ├── lib/stores/           # State management
│   └── lib/types/            # TypeScript interfaces
├── src-tauri/src/            # Backend (Rust)
│   ├── commands/             # Tauri IPC handlers
│   ├── lib.rs                # Main app setup
│   └── types.rs              # Shared types
├── tests/                    # Tests
└── public/                   # Static assets
```

## Coding Standards

### TypeScript/Svelte

```typescript
// Use strict typing
const getValue = (key: string): string | null => {
  // Implementation
};

// Prefer const/let over var
const result = 42;

// Use async/await
const data = await fetchPapers();

// Keep components focused and reusable
// Components in lib/components/, logic in lib/services/
```

### Rust

```rust
// Follow Rust conventions
pub async fn handle_paper(path: PathBuf) -> Result<Paper, Error> {
    // Implementation
}

// Use type-safe enums and Results
match result {
    Ok(value) => { /* handle success */ },
    Err(e) => { /* handle error */ },
}

// Prefer descriptive names
let paper_metadata = extract_metadata(&pdf_path)?;
```

## Testing

### Running Tests

```bash
# Frontend tests
pnpm test                 # Run once
pnpm test:watch          # Watch mode
pnpm test:ui             # UI mode

# Build tests (ensures release build works)
pnpm tauri build
```

### Writing Tests

- **Unit tests**: Test individual functions/components
- **Integration tests**: Test component interactions
- **End-to-end**: Test full workflows in `tests/`
- Use descriptive test names: `test("should validate paper metadata")`

## Documentation

- Update `README.md` for user-facing changes
- Add inline comments for complex logic
- Keep docs in sync with code changes
- Use clear, concise language

## Release Process

- Versions follow [Semantic Versioning](https://semver.org/)
- Releases are tagged on main branch
- Automated builds create binaries for all platforms
- Release notes document changes and migration guides (if needed)

## Getting Help

- **Questions**: Open an issue or email jesseosems123@gmail.com
- **Code review**: Ask for feedback in PRs
- **Discussions**: GitHub Discussions (coming soon)

## Recognition

Contributors will be:
- Listed in release notes for significant contributions
- Added to CONTRIBUTORS.md
- Celebrated in our community

---

Thank you for making Anya better! 🎉
