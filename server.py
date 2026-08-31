#!/usr/bin/env python3
"""
Chiswick Sculling Ladder - Simple Backend Server
Serves static files and provides API for saving/loading votes.
No external dependencies required.
"""

import http.server
import json
import os
import urllib.parse
from pathlib import Path

PORT = int(os.environ.get("PORT", 8080))
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
VOTES_FILE = DATA_DIR / "votes.json"
CONFIG_FILE = DATA_DIR / "config.json"
SCULLERS_FILE = DATA_DIR / "scullers.json"
HISTORY_DIR = DATA_DIR / "history"

DATA_DIR.mkdir(exist_ok=True)
HISTORY_DIR.mkdir(exist_ok=True)

def load_votes():
    if VOTES_FILE.exists():
        with open(VOTES_FILE, "r") as f:
            data = json.load(f)
            data.setdefault("requests", [])
            return data
    return {"caught": {}, "participation": {}, "manualStarts": {}, "requests": []}

def save_votes(votes):
    with open(VOTES_FILE, "w") as f:
        json.dump(votes, f, indent=2)

def load_scullers():
    if SCULLERS_FILE.exists():
        with open(SCULLERS_FILE, "r") as f:
            return json.load(f)
    return []

def save_scullers(scullers):
    tmp = SCULLERS_FILE.with_suffix(".tmp")
    with open(tmp, "w") as f:
        json.dump(scullers, f, indent=2)
    tmp.rename(SCULLERS_FILE)

def load_config():
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    return {}

def save_config(config):
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)

class CSLHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/votes":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            votes = load_votes()
            self.wfile.write(json.dumps(votes).encode())
        elif parsed.path == "/api/config":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            config = load_config()
            self.wfile.write(json.dumps(config).encode())
        elif parsed.path == "/api/history":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            dates = sorted([d.stem for d in HISTORY_DIR.glob("*.json")], reverse=True)
            self.wfile.write(json.dumps({"dates": dates}).encode())
        elif parsed.path.startswith("/api/history/"):
            date_str = parsed.path.split("/api/history/")[1]
            history_file = HISTORY_DIR / f"{date_str}.json"
            if history_file.exists():
                with open(history_file, "r") as f:
                    data = json.load(f)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps(data).encode())
            else:
                self.send_response(404)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "not found"}).encode())
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/requests":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            try:
                new_req = json.loads(body)
                current = load_votes()
                requests = current.setdefault("requests", [])
                new_id = max([r.get("id", 0) for r in requests], default=0) + 1
                new_req["id"] = new_id
                new_req["status"] = "pending"
                requests.append(new_req)
                save_votes(current)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": True, "id": new_id}).encode())
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        elif parsed.path == "/api/votes":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            try:
                new_votes = json.loads(body)
                current = load_votes()
                if "caught" in new_votes:
                    if new_votes.get("clearParticipation"):
                        current["caught"] = {}
                    else:
                        for k, v in new_votes["caught"].items():
                            if v is None:
                                current.setdefault("caught", {}).pop(k, None)
                            else:
                                current.setdefault("caught", {})[k] = v
                if "participation" in new_votes:
                    if new_votes.get("clearParticipation"):
                        current["participation"] = {}
                    else:
                        for k, v in new_votes["participation"].items():
                            if v is None:
                                current.setdefault("participation", {}).pop(k, None)
                            else:
                                current.setdefault("participation", {})[k] = v
                if "manualStarts" in new_votes:
                    if new_votes.get("clearParticipation"):
                        current["manualStarts"] = {}
                    else:
                        current.setdefault("manualStarts", {}).update(new_votes["manualStarts"])
                save_votes(current)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": True}).encode())
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        elif parsed.path == "/api/config":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            try:
                new_config = json.loads(body)
                current = load_config()
                current.update(new_config)
                save_config(current)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": True}).encode())
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        elif parsed.path == "/api/scullers":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            try:
                new_scullers = json.loads(body)
                save_scullers(new_scullers)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": True}).encode())
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        elif parsed.path == "/api/history/save":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            try:
                snapshot = json.loads(body)
                date_str = snapshot.get("date", "")
                if not date_str:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "missing date"}).encode())
                    return
                history_file = HISTORY_DIR / f"{date_str}.json"
                with open(history_file, "w") as f:
                    json.dump(snapshot, f, indent=2)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": True, "date": date_str}).encode())
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path.startswith("/api/requests/"):
            req_id = int(parsed.path.split("/api/requests/")[1])
            current = load_votes()
            requests = current.get("requests", [])
            current["requests"] = [r for r in requests if r.get("id") != req_id]
            save_votes(current)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": True}).encode())
        elif parsed.path.startswith("/api/history/"):
            date_str = parsed.path.split("/api/history/")[1]
            history_file = HISTORY_DIR / f"{date_str}.json"
            if history_file.exists():
                history_file.unlink()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": True}).encode())
            else:
                self.send_response(404)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "not found"}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, format, *args):
        print(f"[CSL] {args[0]}")

if __name__ == "__main__":
    with http.server.HTTPServer(("", PORT), CSLHandler) as httpd:
        print(f"Chiswick Sculling Ladder server running at http://localhost:{PORT}")
        print(f"Votes stored at: {VOTES_FILE}")
        httpd.serve_forever()
