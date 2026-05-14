# Copyright (c) 2026 Alex Wang
# @author Alex Wang <https://github.com/wanglongxiao>
# @contact https://www.linkedin.com/in/alexwanglx/

import json
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from api.config import get_app_config, get_ui_config
from api.routes import analyze

app_config = get_app_config()

app = FastAPI(title=app_config.get("name", "Construction Safety Monitor API"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))


@app.get("/")
async def index(request: Request):
    ui = get_ui_config()
    site_names = ["Construction Site 1", "Construction Site 2", "Construction Site 3"]
    return templates.TemplateResponse("index.html", {
        "request": request,
        "image_page_size": ui.get("imagePageSize", 20),
        "site_names": json.dumps(site_names),
    })


@app.get("/api/health")
async def health():
    return {"success": True, "message": "ok"}


@app.get("/api/config")
async def config():
    ui = get_ui_config()
    return {"imagePageSize": ui.get("imagePageSize", 20)}


app.include_router(analyze.router, prefix="/api/analyze", tags=["analyze"])


@app.exception_handler(Exception)
async def global_exception_handler(_request: Request, _exc: Exception):
    return JSONResponse(status_code=500, content={"success": False, "error": "Server internal error"})
