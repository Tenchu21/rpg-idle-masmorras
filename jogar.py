#!/usr/bin/env python3
"""Abre o jogo no navegador usando um servidor local (necessário para carregar os JSON).
Uso: python jogar.py   (Ctrl+C para fechar)"""
import http.server
import os
import socketserver
import threading
import webbrowser

os.chdir(os.path.dirname(os.path.abspath(__file__)))
socketserver.TCPServer.allow_reuse_address = True


class Quieto(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


servidor = None
for porta in range(8000, 8011):
    try:
        servidor = socketserver.TCPServer(("127.0.0.1", porta), Quieto)
        break
    except OSError:
        continue

if servidor is None:
    raise SystemExit("Não achei porta livre entre 8000 e 8010.")

url = f"http://localhost:{porta}/"
print(f"Jogo rodando em {url}  (Ctrl+C para fechar)")
threading.Timer(0.5, lambda: webbrowser.open(url)).start()
try:
    servidor.serve_forever()
except KeyboardInterrupt:
    print("\nEncerrado.")
