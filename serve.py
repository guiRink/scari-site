import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ThreadingHTTPServer(("127.0.0.1", 8734), SimpleHTTPRequestHandler).serve_forever()
