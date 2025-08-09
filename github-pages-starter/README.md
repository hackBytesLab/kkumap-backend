# GitHub Pages Starter (Static Site)

Static HTML + Tailwind (CDN) + GitHub Actions workflow for automatic deploy to GitHub Pages.

## Quick Start
1. Create a GitHub repo (Public), name it anything (e.g., `my-website`).
2. Put these files at repo **root**:
   - `index.html`
   - `.github/workflows/pages.yml`
3. Commit & push to `main`.
4. In repo **Settings → Pages**, set **Source = GitHub Actions**.
5. Open: `https://<USERNAME>.github.io/<REPO>/`

> Tip: If you see 404, ensure `index.html` is at repo root and Actions run succeeded.
