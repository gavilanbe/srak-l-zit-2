#!/usr/bin/env python3
"""Sirve play/ en el puerto 8766 (también para el móvil por la red local), sin caché y aguantando las peticiones simultáneas del navegador."""
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


def lan_ip():
    """La IP de este equipo en la red local, para abrir el juego desde el móvil."""
    import socket
    probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        probe.connect(('10.255.255.255', 1))
        return probe.getsockname()[0]
    except OSError:
        return None
    finally:
        probe.close()


print('Srak l zit en  http://localhost:8766')
if lan_ip():
    print(f'En el móvil (misma wifi):  http://{lan_ip()}:8766')
# 0.0.0.0: accesible también desde otros dispositivos de la red local, para jugar en el móvil
Server(('0.0.0.0', 8766), Handler).serve_forever()
