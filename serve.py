#!/usr/bin/env python3
"""
Local preview server that behaves like Vercel does in production.

    python3 serve.py [port]

Vercel serves this site with "cleanUrls": true (see vercel.json), so /about is
served from about.html and a missing path returns 404.html. Python's stock
http.server does neither, which would make every internal link 404 locally
while working fine once deployed. This adds just those two rules so what you
see locally is what ships.
"""

import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))


class CleanUrlHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Without this the browser applies its own freshness heuristic and keeps
        # serving the previous style.css after a rebuild, which looks exactly
        # like a CSS bug.
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def translate_path(self, path):
        local = super().translate_path(path)
        if os.path.isdir(local) or os.path.exists(local):
            return local
        # /about -> about.html, matching Vercel's cleanUrls
        if not os.path.splitext(local)[1] and os.path.exists(local + ".html"):
            return local + ".html"
        return local

    def send_error(self, code, message=None, explain=None):
        if code == 404:
            page = os.path.join(ROOT, "404.html")
            if os.path.exists(page):
                body = open(page, "rb").read()
                self.send_response(404)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                if self.command != "HEAD":
                    self.wfile.write(body)
                return
        super().send_error(code, message, explain)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
    os.chdir(ROOT)
    print("serving %s on http://localhost:%d (clean URLs, custom 404)" % (ROOT, port))
    ThreadingHTTPServer(("", port), CleanUrlHandler).serve_forever()
