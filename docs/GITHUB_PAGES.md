# GitHub Pages Setup Guide

This guide walks you through setting up a GitHub Pages website for your Anya project—perfect for documentation, screenshots, and community engagement.

## What is GitHub Pages?

GitHub Pages is free static site hosting directly from your GitHub repository. Your site will be live at:

```
https://yourusername.github.io/anya-ra/
```

Perfect for:
- Project homepage and documentation
- Feature showcase
- User guides and tutorials
- Community blog posts
- Links to downloads and support

---

## Option 1: Quick Setup (Recommended)

### Step 1: Enable GitHub Pages

1. Go to your repository: `https://github.com/yourusername/anya-ra`
2. Click **Settings** (repo settings, not your profile)
3. In left sidebar, scroll to **Pages**
4. Under "Build and deployment":
   - **Source**: Select "Deploy from a branch"
   - **Branch**: Select `main` (or your default branch)
   - **Folder**: Select `/ (root)`
5. Click **Save**

GitHub will start building your site. Check the green checkmark after ~1 minute.

### Step 2: Visit Your Site

Your site is now live at: `https://yourusername.github.io/anya-ra/`

It will initially show your `README.md` as the homepage (styled automatically).

---

## Option 2: Custom Documentation Site (With Jekyll Theme)

For a more polished look, use Jekyll themes.

### Step 1: Add Jekyll Configuration

Create `.github/pages/_config.yml`:

```yaml
title: Anya Research Assistant
description: Manage papers, take notes, visualize knowledge networks
logo: https://raw.githubusercontent.com/yourusername/anya-ra/main/public/icons/icon-512x512.png
show_downloads: true
theme: jekyll-theme-minimal

# Navigation
nav:
  - text: Home
    href: /anya-ra/
  - text: Download
    href: https://github.com/yourusername/anya-ra/releases
  - text: Docs
    href: /anya-ra/docs/
  - text: GitHub
    href: https://github.com/yourusername/anya-ra

plugins:
  - jekyll-feed
  - jekyll-seo-tag
```

### Step 2: Create Homepage

Create `docs/index.md`:

```markdown
# Anya: Your Research Assistant

**Download now:** [Latest Release](https://github.com/yourusername/anya-ra/releases)

## Quick Links

- [Setup Guide](AI_SETUP.md)
- [Contributing](../CONTRIBUTING.md)
- [Release Notes](../RELEASE.md)
- [GitHub Issues](https://github.com/yourusername/anya-ra/issues)

## Features

- 📄 Manage academic papers
- 📝 Rich note-taking with markdown
- 🤖 AI-powered research assistant
- 📊 Knowledge graph visualization
- 🔍 Full-text search across your library
- 💾 Export to PDF, Word, ZIP

## Supported Platforms

| Platform | Formats |
|----------|---------|
| **macOS** | `.dmg` (Intel & Apple Silicon) |
| **Windows** | `.msi` (x86, x64, ARM64) |
| **Linux** | `.AppImage` (x86_64, ARM64) |

## Get Started

1. Download for your platform
2. Install and launch
3. Create a workspace
4. Import your first PDF
5. Start researching!

---

[View on GitHub](https://github.com/yourusername/anya-ra)
```

### Step 3: Enable Pages in Settings

1. Go to **Settings** → **Pages**
2. **Source**: Select "Deploy from a branch"
3. **Branch**: Select `main`
4. **Folder**: Select `/docs`
5. Click **Save**

Your site will rebuild in ~1 minute.

---

## Option 3: Custom Static Site (Advanced)

For complete control, use any static site generator (Hugo, Next.js, etc.).

### Build a Custom Site

Example with a simple HTML structure:

```
docs/
├── index.html
├── features.html
├── setup.html
└── assets/
    ├── css/
    └── images/
```

Then point GitHub Pages to the `docs/` folder.

---

## Recommended Jekyll Themes

Popular minimal themes:

- **jekyll-theme-minimal** (default) - Clean, distraction-free
- **jekyll-theme-slate** - Dark professional look
- **jekyll-theme-leap-day** - Modern with colors
- **jekyll-theme-cayman** - Bright and friendly

Change theme in `_config.yml`:

```yaml
theme: jekyll-theme-slate
```

---

## Adding Content to GitHub Pages

### Navigation Structure

Recommended layout:

```
/                          → README.md (home)
/docs/
  ├── index.md            → Custom homepage
  ├── getting-started.md  → Installation guide
  ├── features.md         → Feature overview
  ├── ai-setup.md         → Link to AI_SETUP.md
  └── faq.md              → Frequently asked questions
```

### Linking Between Pages

In markdown files:

```markdown
# Internal Links
[Setup Guide](./getting-started.md)
[Download](https://github.com/yourusername/anya-ra/releases)

# External Links
[GitHub Issues](https://github.com/yourusername/anya-ra/issues)
```

---

## Custom Domain (Optional)

If you own a custom domain, use it instead of `github.io`:

1. Go to **Settings** → **Pages**
2. Under "Custom domain", enter: `your-domain.com`
3. GitHub will add DNS checks
4. Follow DNS setup instructions from your domain registrar
5. Your site will be at: `https://your-domain.com/anya-ra/`

---

## Troubleshooting

### Site Not Publishing

Check the **Actions** tab:
1. Go to your repo
2. Click **Actions**
3. Look for "pages build and deployment"
4. If red ❌: Click it to see error details

Common issues:
- Branch doesn't exist (use `main` if unsure)
- Wrong folder (`/` for repo root, `/docs/` for docs folder)
- Jekyll syntax errors in `_config.yml`

### Site Shows Old Content

Push the changes and wait 1-2 minutes:
```bash
git add docs/
git commit -m "docs: Update GitHub Pages site"
git push origin main
```

Check **Settings** → **Pages** to verify build status.

### Custom Domain Issues

Verify DNS records with your registrar. Common issues:
- CNAME record not pointing to `yourusername.github.io`
- HTTPS certificate still loading (wait 5 minutes)
- Old DNS cache (flush with `dig your-domain.com`)

---

## Going Live with Your Site

### Before Launch

- [ ] Setup GitHub Pages in repo settings
- [ ] Create docs/index.md or use README.md
- [ ] Add links to setup guides and downloads
- [ ] Test all links work
- [ ] Check on mobile view

### Launch Checklist

- [ ] Site builds successfully (check Actions tab)
- [ ] Homepage looks good
- [ ] Navigation works
- [ ] Download links point to releases
- [ ] Share in GitHub repo description

### Promotion

After launch:
1. Add website link to **GitHub repo description**
2. Share on social media
3. Add to your README: `[Website](https://yourusername.github.io/anya-ra/)`
4. Announce in release notes

---

## Example: Complete Setup

Here's a complete minimal setup:

**1. repo settings (web UI):**
- Pages → Deploy from `main` branch, `/` root

**2. README.md (already exists):**
- Top of file: Add link to website
- Links to AI_SETUP.md and CONTRIBUTING.md

**3. No additional files needed!**
- GitHub automatically serves your README as homepage

**That's it!** Your site is live.

---

## Advanced: Custom Styling

Create `docs/_layouts/default.html` for custom styling:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
      max-width: 960px;
      margin: 0 auto;
      padding: 20px;
    }
    header {
      text-align: center;
      border-bottom: 1px solid #eee;
      margin-bottom: 30px;
    }
  </style>
</head>
<body>
  <header>
    <h1>Anya Research Assistant</h1>
    <p>Manage papers, take notes, discover connections</p>
  </header>
  {{ content }}
</body>
</html>
```

---

## Resources

- [GitHub Pages Docs](https://docs.github.com/pages)
- [Jekyll Documentation](https://jekyllrb.com)
- [GitHub Pages Themes](https://pages.github.com/themes/)
- [Markdown Syntax](https://www.markdownguide.org/)

---

## Next Steps

1. Enable GitHub Pages in your repo settings
2. Push your code with README.md
3. Visit `https://yourusername.github.io/anya-ra/`
4. Customize from there!

---

Questions? Email: jesseosems123@gmail.com
