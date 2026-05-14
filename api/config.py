# Copyright (c) 2026 Alex Wang
# @author Alex Wang <https://github.com/wanglongxiao>
# @contact https://www.linkedin.com/in/alexwanglx/

import os

import yaml


def _load_config() -> dict:
    config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config.yaml")
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


_CONFIG = _load_config()

APP = _CONFIG.get("app", {})
LLM = _CONFIG.get("llm", {})
UI = _CONFIG.get("ui", {})

DEFAULTS = {
    "app": {"name": "Construction Safety Monitor", "version": "1.0.0"},
    "llm": {
        "provider": "BytePlus Ark",
        "apiUrl": "https://ark.ap-southeast.bytepluses.com/api/v3/chat/completions",
        "apiKey": "",
        "model": "seed-2-0-lite-260228",
        "thinking": {"level": "basic", "type": "enabled"},
    },
    "ui": {"imagePageSize": 15},
}


def get_app_config() -> dict:
    return {**DEFAULTS["app"], **APP}


def get_llm_config() -> dict:
    merged = {**DEFAULTS["llm"], **LLM}
    merged["thinking"] = {**DEFAULTS["llm"]["thinking"], **LLM.get("thinking", {})}
    return merged


def get_ui_config() -> dict:
    return {**DEFAULTS["ui"], **UI}
