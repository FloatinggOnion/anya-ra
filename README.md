# Anya: Your Research Assistant

A powerful, open-source desktop application for managing academic papers, taking notes, visualizing knowledge networks, and conducting research analysis all in one place.

![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform Support](https://img.shields.io/badge/platforms-macOS%20%7C%20Windows%20%7C%20Linux-success)

## 📖 About

Anya is a research companion designed for academics, students, and researchers who work with academic papers. It combines the best of document management, note-taking, and knowledge visualization into a native desktop app that's fast, offline-capable, and respects your privacy.

### Why Anya?

- **All-in-One Workspace**: Manage papers, annotations, notes, and knowledge graphs without context switching
- **Privacy First**: Your research data stays on your machine—no cloud lock-in
- **Powerful Search**: Full-text search across papers, notes, and metadata with smart filtering
- **Paper Integration**: Direct search and import from ArXiv and Semantic Scholar
- **Rich Annotations**: Highlight, annotate, and organize PDF papers with ease
- **Knowledge Graphs**: Visualize connections between concepts, papers, and ideas
- **Export Everything**: Export to PDF, Word, or ZIP archives—your data, your format
- **Fast & Responsive**: Native app performance with Tauri + Rust backend

## ✨ Features

- **Paper Management**
  - Import PDFs and organize into workspaces
  - Metadata extraction and custom tagging
  - Full-text search across your library
  - Direct search on ArXiv and Semantic Scholar

- **Annotations & Highlighting**
  - Annotate and highlight PDFs
  - Organize annotations by color and topic
  - Extract and reference annotations in notes

- **Note-taking**
  - Markdown-based note editor with live preview
  - Link notes to papers and other notes
  - Organize notes by topic or project

- **Knowledge Visualization**
  - Interactive graph view of paper relationships
  - Visualize concept connections
  - Explore your research network

- **Export & Sharing**
  - Export papers and notes to PDF
  - Generate Word documents (.docx)
  - Create ZIP archives of workspace content

- **AI Integration**
  - Chat with your research data
  - Ollama (local) or OpenRouter (cloud) support
  - Reference papers and notes in conversations
  - Secure API key storage

## 🚀 Quick Start

### Installation

Download the latest version for your platform from [Releases](https://github.com/yourusername/anya-ra/releases):

- **macOS**: `Anya_x.x.x_aarch64.dmg` (Apple Silicon) or `Anya_x.x.x_x64.dmg` (Intel)
- **Windows**: `Anya_x.x.x_x64_en-US.msi` (64-bit) or `Anya_x.x.x_x86_en-US.msi` (32-bit)
- **Linux**: `anya_x.x.x_amd64.AppImage` or `.deb` package

### System Requirements

- **macOS**: 10.13+
- **Windows**: Windows 10/11 with x86, x64, or ARM64 processor
- **Linux**: glibc 2.29+

### AI Integration (Optional)

Anya integrates with two LLM providers for AI-powered chat:

1. **Ollama** (Local, Free)
   - Run LLMs locally without internet
   - [Install Ollama](https://ollama.ai)
   - Default model: `qwen2:0.5b`
   - Run: `ollama serve`

2. **OpenRouter** (Cloud, Paid)
   - Access to GPT-4o, Claude, Gemini, and more
   - [Get API key at OpenRouter](https://openrouter.ai)
   - Pay-per-use pricing

See [AI Setup Guide](./docs/AI_SETUP.md) for detailed configuration.

### First Steps

1. Launch Anya
2. Create a new workspace
3. Import your first PDF or search ArXiv
4. Start annotating and note-taking!
5. (Optional) Configure AI: Settings → LLM Provider

For detailed setup instructions, see [SETUP.md](./docs/SETUP.md).

## 🛠 Development Setup

### Prerequisites

- **Node.js**: 18+ with pnpm (`npm install -g pnpm`)
- **Rust**: 1.70+ (install from [rustup.rs](https://rustup.rs/))
- **Tauri CLI**: `cargo install tauri-cli`

### Optional: Local LLM Support

To use Ollama for local AI features (no API key required):

```bash
# Install Ollama
# macOS/Linux: https://ollama.ai
# Windows: https://ollama.ai/download/windows
# Then start the service:
ollama serve

# Pull a model (one-time):
ollama pull qwen2:0.5b
```

See [AI Setup Guide](./docs/AI_SETUP.md) for detailed configuration.

### Installation

```bash
git clone https://github.com/yourusername/anya-ra.git
cd anya-ra
pnpm install
```

### Running Locally

```bash
pnpm tauri dev
```

This starts the dev server on port 1420 and opens the app with hot reload enabled.

### Building

```bash
pnpm tauri build
```

Outputs platform-specific binaries to `src-tauri/target/release/bundle/`.

### Running Tests

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# UI mode
pnpm test:ui

# Coverage
pnpm test:coverage
```

## 📁 Project Structure

```
anya-ra/
├── src/                  # Frontend (Svelte + TypeScript)
│   ├── lib/
│   │   ├── components/   # Reusable UI components
│   │   ├── services/     # Business logic
│   │   ├── stores/       # State management
│   │   ├── types/        # TypeScript types
│   │   └── pdf/          # PDF utilities
│   └── App.svelte        # Root component
├── src-tauri/            # Backend (Rust + Tauri)
│   ├── src/
│   │   ├── commands/     # Tauri command handlers
│   │   ├── lib.rs        # App initialization
│   │   └── types.rs      # Shared types
│   └── Cargo.toml        # Rust dependencies
├── tests/                # End-to-end tests
└── public/               # Static assets
```

## 📚 Documentation

- **[AI Setup Guide](./docs/AI_SETUP.md)** - Configure Ollama or OpenRouter for AI features
- **[GitHub Pages Setup](./docs/GITHUB_PAGES.md)** - Deploy your own documentation site
- **[Release Guide](./RELEASE.md)** - How to build and release for all platforms
- **[Contributing Guide](./CONTRIBUTING.md)** - How to contribute code

## 🤝 Contributing

We welcome contributions! Whether it's bug reports, feature requests, or code improvements, please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -am 'Add feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a Pull Request

### Code Style

- Use `pnpm` for JavaScript dependencies
- Follow Rust conventions (enforced by `clippy`)
- TypeScript strict mode enabled
- Comments only for non-obvious logic

## 📝 Architecture Notes

### Frontend

Built with **Svelte 5** and **SvelteKit**, compiled to static assets that are served by Tauri's webview.

**Key Libraries:**
- **CodeMirror 6**: Markdown editor
- **PDF.js**: PDF rendering and manipulation
- **XY Flow**: Graph visualization
- **html2canvas/jsPDF/docx**: Export functionality
- **js-tiktoken**: Token counting for LLM context

### Backend

Written in **Rust** using **Tauri 2** framework.

**Key Responsibilities:**
- File system operations (papers, workspaces, backups)
- Database queries and persistence
- External API integrations (ArXiv, Semantic Scholar)
- PDF processing and annotation handling
- Chat/LLM integration (Ollama & OpenRouter)

**Performance Optimizations:**
- Link-time optimization (LTO) in release builds
- Binary stripping for smaller app size
- Async/await with Tokio runtime

### AI Integration Architecture

Anya supports two LLM providers:

1. **Ollama** (Local)
   - Connects to `http://localhost:11434`
   - No API key required
   - Runs models locally on your machine
   - Default: `qwen2:0.5b`

2. **OpenRouter** (Cloud)
   - Remote API: `https://openrouter.ai/api/v1`
   - Supports 15+ models (GPT-4o, Claude 3.5, Gemini, etc.)
   - Requires API key (securely stored in OS keychain)
   - Pay-per-token pricing

Users can seamlessly switch between providers in settings. See [AI Setup Guide](./docs/AI_SETUP.md).

## 🐛 Reporting Issues

Found a bug? Have a feature request? Please open an issue on [GitHub Issues](https://github.com/yourusername/anya-ra/issues).

Include:
- Detailed description of the issue
- Steps to reproduce
- OS and version
- Expected vs actual behavior
- Screenshots if applicable

## 💬 Communication & Support

- **Email**: jesseosems123@gmail.com
- **GitHub Issues**: For bug reports and feature requests
- **Discussions**: Coming soon!

Have questions or suggestions? Feel free to reach out via email or open an issue.

## 📜 License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) file for details.

---

## Acknowledgments

Built with love using:
- [Tauri](https://tauri.app/) - Desktop framework
- [Svelte](https://svelte.dev/) - UI framework
- [Rust](https://www.rust-lang.org/) - Systems language
- Community libraries and integrations

---

Made with ❤️ for the research community
