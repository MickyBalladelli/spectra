#!/usr/bin/env python3
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock

import numpy as np
from turbovec import IdMapIndex


HOST = os.environ.get("TURBOVEC_HOST", "127.0.0.1")
PORT = int(os.environ.get("TURBOVEC_PORT", "7017"))
DIM = int(os.environ.get("TURBOVEC_DIM", "128"))
BIT_WIDTH = int(os.environ.get("TURBOVEC_BIT_WIDTH", "4"))
INDEX_PATH = Path(os.environ.get("TURBOVEC_INDEX_PATH", "data/turbovec/spectra.tvim"))

lock = Lock()


def load_index():
  INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
  if INDEX_PATH.exists():
    return IdMapIndex.load(str(INDEX_PATH))
  return IdMapIndex(dim=DIM, bit_width=BIT_WIDTH)


index = load_index()


def save_index():
  INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
  index.write(str(INDEX_PATH))


def read_json(handler):
  length = int(handler.headers.get("content-length", "0"))
  if length == 0:
    return {}
  return json.loads(handler.rfile.read(length).decode("utf-8"))


def write_json(handler, status, payload):
  body = json.dumps(payload).encode("utf-8")
  handler.send_response(status)
  handler.send_header("content-type", "application/json")
  handler.send_header("content-length", str(len(body)))
  handler.end_headers()
  handler.wfile.write(body)


def vector_array(vectors):
  array = np.asarray(vectors, dtype=np.float32)
  if array.ndim == 1:
    array = array.reshape(1, -1)
  if array.shape[1] != DIM:
    raise ValueError(f"expected dimension {DIM}, got {array.shape[1]}")
  return array


class Handler(BaseHTTPRequestHandler):
  def do_GET(self):
    if self.path != "/health":
      write_json(self, 404, {"ok": False, "error": "not found"})
      return

    write_json(self, 200, {
      "ok": True,
      "dim": DIM,
      "bitWidth": BIT_WIDTH,
      "indexPath": str(INDEX_PATH)
    })

  def do_POST(self):
    try:
      payload = read_json(self)

      if self.path == "/upsert":
        self.handle_upsert(payload)
      elif self.path == "/remove":
        self.handle_remove(payload)
      elif self.path == "/search":
        self.handle_search(payload)
      else:
        write_json(self, 404, {"ok": False, "error": "not found"})
    except Exception as error:
      write_json(self, 500, {"ok": False, "error": str(error)})

  def handle_upsert(self, payload):
    items = payload.get("items") or []
    ids = np.asarray([int(item["id"]) for item in items], dtype=np.uint64)
    vectors = vector_array([item["vector"] for item in items])

    with lock:
      for item_id in ids:
        try:
          index.remove(int(item_id))
        except Exception:
          pass
      index.add_with_ids(vectors, ids)
      save_index()

    write_json(self, 200, {"ok": True, "count": int(len(ids))})

  def handle_remove(self, payload):
    ids = [int(item_id) for item_id in payload.get("ids") or []]

    with lock:
      removed = 0
      for item_id in ids:
        try:
          index.remove(item_id)
          removed += 1
        except Exception:
          pass
      if removed > 0:
        save_index()

    write_json(self, 200, {"ok": True, "removed": removed})

  def handle_search(self, payload):
    vector = vector_array(payload.get("vector") or [])
    k = max(1, int(payload.get("k") or 10))

    with lock:
      scores, ids = index.search(vector, k)

    flat_scores = np.asarray(scores).reshape(-1)
    flat_ids = np.asarray(ids).reshape(-1)
    results = [
      {"id": int(item_id), "score": float(score)}
      for item_id, score in zip(flat_ids, flat_scores)
      if int(item_id) > 0
    ]

    write_json(self, 200, {"ok": True, "results": results})

  def log_message(self, format, *args):
    return


if __name__ == "__main__":
  server = ThreadingHTTPServer((HOST, PORT), Handler)
  print(f"Turbovec sidecar listening on http://{HOST}:{PORT}")
  server.serve_forever()
