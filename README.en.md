# Construction Safety Monitor

## Features

- Web interface for construction site image safety hazard identification
- Batch loading of site images with concurrent LLM analysis
- Hazard statistics, alert lists, detailed reasons, and bounding box visualization
- Backend-proxied LLM access to prevent credential exposure in the browser
- All runtime parameters (model, API Key, thinking, page size) managed in `config.yaml`

## Screenshots

**Image Grid & Safety Detection**

![Screenshot-1](Screenshot-1.png)

**Alert Details & Hazard Bounding Box**

![Screenshot-2](Screenshot-2.png)

## System Architecture

```
┌──────────────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  Jinja2 + Vanilla JS     │──────▶│  FastAPI + Uvicorn│──────▶│  BytePlus Ark    │
│  Tailwind CDN (Browser)  │◀──────│   Backend (3001)  │◀──────│  LLM API          │
└──────────────────────────┘       └──────────────────┘       └──────────────────┘
         │                                   │
         │    /api/config                    │   config.yaml
         │◀──────────────────────────────────│◀──┘
         │    /api/analyze                   │
         │──────────────────────────────────▶│
```

- **Frontend**: Jinja2 Templates + Vanilla JavaScript + Tailwind CSS (CDN)
- **Backend**: Python + FastAPI + Uvicorn
- **LLM**: BytePlus Ark Chat Completions API (`seed-2-0-lite-260228`)
- **Configuration**: `config.yaml`

Request flow:

1. Browser requests `/`, FastAPI renders the page via Jinja2
2. Frontend fetches runtime settings (e.g. image page size) from `/api/config`
3. Frontend sends image URL to `/api/analyze`
4. Backend reads API Key, model, and thinking settings from `config.yaml`
5. Backend calls the LLM endpoint and parses the response
6. Frontend renders status, hazard details, and usage stats

## Project Structure

```
├── api/                        # Python backend
│   ├── __init__.py
│   ├── main.py                 # FastAPI application entry (template rendering, static files, routes)
│   ├── config.py               # Configuration reader (reads config.yaml)
│   └── routes/
│       ├── __init__.py
│       └── analyze.py          # Image safety analysis route (LLM integration)
├── templates/
│   └── index.html              # Jinja2 page template
├── static/
│   ├── css/
│   │   └── app.css             # Custom styles (animations, utilities)
│   ├── data/
│   │   └── images.json         # Image URL list
│   └── js/
│       └── app.js              # Frontend interaction logic (Vanilla JS)
├── config.yaml                 # Runtime config (model, API Key, UI params)
├── requirements.txt            # Python dependencies
├── .gitignore
├── README.md                   # Chinese documentation
└── README.en.md                # English documentation
```

## Usage

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure config.yaml

All runtime parameters are set in `config.yaml`, including the API Key:

```yaml
app:
  name: Construction Safety Monitor
  version: 1.0.0

llm:
  provider: BytePlus Ark
  apiUrl: https://ark.ap-southeast.bytepluses.com/api/v3/chat/completions
  apiKey: your_api_key_here
  model: seed-2-0-lite-260228
  thinking:
    level: basic
    type: enabled

ui:
  imagePageSize: 15
```

Field reference:

| Field | Description |
|-------|-------------|
| `llm.apiKey` | Authentication key for the model service (obtain from https://console.byteplus.com/ark) |
| `llm.apiUrl` | Model endpoint URL |
| `llm.model` | Target model ID |
| `llm.thinking.level` | Project-level thinking profile label |
| `llm.thinking.type` | Actual thinking mode sent to the API (`enabled`/`disabled`/`auto`) |
| `ui.imagePageSize` | Number of images displayed per page |

### 3. Start the server

```bash
python3 -m uvicorn api.main:app --reload --port 3001
```

Visit http://localhost:3001 after startup.

## Image Data Source

The project currently uses `static/data/images.json` with a preset list of construction site image URLs for demo and development purposes.

In production, the static images should be replaced with live data sources, such as:

- **CCTV video stream integration**: Connect to on-site surveillance cameras via RTSP / RTMP streams for real-time footage
- **Video frame extraction**: Capture frames from video streams at fixed intervals (e.g. every 5 seconds) and submit them to the LLM for safety analysis
- **Other image sources**: Integrate drone aerial shots, mobile photo uploads, etc.

To switch: modify the image loading logic in `static/js/app.js` — replace `fetchImages()` from reading the local JSON file to calling a backend API that returns real-time frame images.

## Configuration Rules

- All API Keys / AK / SK / Tokens must be set only in `config.yaml`; code files reference them through the config module
- Application code must not hardcode credentials, model IDs, or page sizes
- Changing models or parameters only requires editing `config.yaml`
- `config.yaml` should not be committed to public repositories (excluded in `.gitignore`)

## Open Source Rules

- Copyright (c) 2026 Alex Wang
- Author: Alex Wang
- GitHub: <https://github.com/wanglongxiao>
- Contact: <https://www.linkedin.com/in/alexwanglx/>
- Learning, internal use, and secondary development are allowed
- Copyright, author, and contact information must be preserved
- Derived works must keep the source header notice
- Secrets and private credentials must never be committed to public repositories

## Version Policy

- Current version: `1.0.0`
- Increase the version only for major feature updates
