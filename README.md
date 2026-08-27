# OMID/OS

AI-powered terminal portfolio for **Omid Erfanmanesh — AI Engineer**.

A green phosphor CRT-style terminal interface where visitors can explore Omid's work through real shell commands or by simply asking natural-language questions.

> Don't browse my portfolio. Talk to it.

This project is an incremental transformation of the original [`harungecit/terminal-portfolio`](https://github.com/harungecit/terminal-portfolio) repository.

## What it is

- Full-screen XTerm.js terminal as the primary interface.
- Portfolio content is generated from Omid's CV (`reference/OErfanmaneshCV.pdf`) and stored in `assets/data/portfolio.js`.
- AI assistant (Omid AI) uses Ollama Cloud and answers from verified portfolio context.
- AI questions tailor the Visual resume by ranking relevant CV-backed evidence first.
- Optional visual mode for recruiters, mobile users and accessibility.
- Responsive, accessible and SEO-friendly.

## Live commands

| Command | Description |
|---------|-------------|
| `help` | Show all commands |
| `about` | About Omid |
| `experience` | Work experience |
| `experience bosch` | Specific role details |
| `projects` / `project applygpt` | Projects |
| `skills` | Technical skills |
| `education` | Education + certifications |
| `timeline` | Career timeline |
| `contact` / `cv` / `github` / `linkedin` | Links and CV |
| `ls`, `cd`, `pwd`, `cat`, `tree` | Virtual filesystem |
| `history`, `clear`, `whoami`, `uname`, `neofetch`, `reset` | System commands |
| Natural question | e.g. `What kind of AI systems has Omid built?` → AI |

Keyboard shortcuts: **↑/↓** history, **Tab** autocomplete, **Ctrl+C** cancel AI/input, **Ctrl+L** clear.

## Requirements

- Node.js 24+ (for Netlify CLI/local dev server)
- Docker (for containerized development)
- Netlify account (for Functions deployment)
- Ollama Cloud API key

## Installation

```bash
git clone https://github.com/omiderfanmanesh/omid-os.git
cd omid-os
npm install
```

## Environment variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

```text
OLLAMA_API_KEY=your_ollama_cloud_api_key
OLLAMA_MODEL=llama3.2
OLLAMA_BASE_URL=https://ollama.com/api
```

**Never commit `.env`.** The API key is only read server-side in `netlify/functions/chat.mjs`.

## Development

### Docker (recommended for local dev)

The easiest way to run locally with full AI support:

```bash
# 1. Create .env with your Ollama credentials
cp .env.example .env
# Edit .env and fill in your OLLAMA_API_KEY, OLLAMA_MODEL, OLLAMA_BASE_URL

# 2. Build and start the container
docker compose up -d

# 3. Open http://localhost:8888
```

The Docker setup:
- Serves static files
- Proxies `/api/chat` to the Ollama function
- Runs the same bounded API proxy used by local development
- Reads `.env` for API credentials

### Netlify CLI

Install the Netlify CLI separately if you need to emulate Netlify Functions locally, then run:

```bash
npm run dev:netlify
```

### Local Node server

```bash
npm start
```

Then open http://localhost:8888.

## Ollama Cloud setup

1. Sign up at [Ollama Cloud](https://ollama.com/) and generate an API key.
2. Choose a model (default in `.env.example` is `llama3.2`; change to whatever Ollama Cloud supports).
3. Add the key and model to your Netlify environment variables (Site settings → Environment variables) or to `.env` for local use.
4. The function at `netlify/functions/chat.mjs` proxies requests, adds the system prompt, injects portfolio context and streams the response.

## Editing portfolio data

All content lives in `assets/data/portfolio.js`. Update:

- `profile` for name, title, summary, contact info.
- `experience` for jobs.
- `projects` for project listings.
- `skills` for grouped skills.
- `education` and `certifications`.

The virtual filesystem (`fileSystem`) and AI knowledge corpus (`knowledgeCorpus`) are generated automatically from these objects, so there is no need to duplicate data.

## CV replacement

1. Replace `reference/OErfanmaneshCV.pdf` with the latest private/source CV.
2. Replace `assets/cv/Omid_Erfanmanesh_CV.pdf` with the public-safe version you want visitors to download.
3. Update `assets/data/portfolio.js` to match the new CV facts.

## Deployment

The repository keeps independent deployment configuration for both platforms:

| Platform | Configuration | Serverless route |
|----------|---------------|------------------|
| Cloudflare Workers | `wrangler.jsonc`, `_headers`, `worker.mjs` | `worker.mjs` |
| Netlify | `netlify.toml`, `netlify/functions/` | `netlify/functions/chat.mjs` |

Both routes use the same shared chat handler, validation, portfolio context and streaming parser.

### Cloudflare Workers deployment (recommended)

1. Rotate the Ollama API key if it has ever appeared in logs or terminal output.
2. Push this repository to GitHub.
3. In Cloudflare, open **Workers & Pages → Create → Import a repository**.
4. Select the repository and configure:

```text
Build command: npm run build
Deploy command: npx wrangler deploy
Root directory: /
```

5. Open the Worker under **Settings → Variables and Secrets** and add:

```text
OLLAMA_API_KEY=<your rotated key>          # encrypted secret
OLLAMA_MODEL=<a model available to you>    # environment variable
OLLAMA_BASE_URL=https://ollama.com/api     # environment variable
```

6. Add the variables to both Production and Preview if deploy previews should use AI.
7. Deploy. Wrangler uploads `dist/` as Static Assets and `worker.mjs` serves `/api/chat`.
8. Under **Custom domains**, add `omid-os.dev` and optionally `www.omid-os.dev`.

For CLI deployment:

```bash
npx wrangler@latest login
npm run deploy:cloudflare
```

### Git-based Netlify deployment

1. Rotate the Ollama API key if it has ever appeared in logs or terminal output.
2. Push this repository to GitHub.
3. In Netlify, choose **Add new site → Import an existing project → GitHub**.
4. Select the repository. Netlify reads the build settings from `netlify.toml`.
5. In **Site configuration → Environment variables**, add:

```text
OLLAMA_API_KEY=<your rotated key>
OLLAMA_MODEL=<an Ollama Cloud model available to your account>
OLLAMA_BASE_URL=https://ollama.com/api
```

6. Deploy the site. Netlify runs `npm run build`, publishes `dist/`, and deploys the chat function separately.

For a custom domain, open **Domain management → Add a domain**, then follow Netlify's DNS instructions.

### Netlify CLI deployment

After installing and authenticating the Netlify CLI:

```bash
netlify login
netlify init
netlify deploy --prod
```

Add secrets through the Netlify dashboard rather than placing them directly in shell commands. The `netlify.toml` configures:

- `NODE_VERSION=24`
- `/api/chat` routing to `netlify/functions/chat`
- a dedicated `dist/` publish directory
- security headers and revalidating asset caching

## AI-tailored Visual resume

When a visitor asks Omid AI a question, OMID/OS updates the Visual tab locally:

- Experience, projects and skill groups relevant to the question move to the top.
- Relevant cards receive a phosphor highlight.
- A banner explains which question the view is tailored for.
- **Reset view** restores the original CV order.

The model never writes resume facts into the page. Personalization only ranks existing data from `assets/data/portfolio.js`, so an unavailable or incorrect AI response cannot alter the CV.

## Architecture

```text
index.html                shell + SEO + visual mode
assets/css/omid-os.css    green CRT theme
assets/data/portfolio.js  single source of truth
assets/js/omid-terminal.js terminal logic, commands, AI client
assets/cv/                public CV PDF
netlify/functions/chat.mjs secure shared Ollama proxy + Netlify adapter
worker.mjs                 Cloudflare Worker adapter
wrangler.jsonc             Cloudflare Worker + Static Assets config
netlify.toml                Netlify deployment config
```

## Privacy & security

- `OLLAMA_API_KEY` is never sent to the browser.
- Visitor IP/location tracking has been removed.
- AI requests are rate-limited and bounded in size.
- System prompt instructs the model not to invent facts about Omid and not to leak configuration.

## Attribution

This site started from the excellent [`harungecit/terminal-portfolio`](https://github.com/harungecit/terminal-portfolio) template. The XTerm.js integration, command-history mechanics and filesystem ideas are derived from that project; branding, content, design and AI backend were rebuilt for Omid Erfanmanesh.

## License

All original portfolio content (name, CV, professional data) belongs to Omid Erfanmanesh.
Underlying implementation patterns retain the license terms of the original repository.
