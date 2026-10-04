#!/usr/bin/env python3
"""Sirve play/ en http://localhost:8766 sin caché y aguantando las peticiones simultáneas del navegador."""
import http.server
import os

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'play'))


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *args):
        pass


class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 128
    daemon_threads = True


Server(('127.0.0.1', 8766), Handler).serve_forever()
