"""
Script de arranque para Windows.
Fuerza SelectorEventLoop ANTES de que uvicorn cree el event loop,
requerido por psycopg3 en Windows con Python 3.12+.
"""
import sys
import asyncio
import selectors

import uvicorn
from uvicorn.config import Config
from uvicorn.server import Server

if sys.platform == "win32":
    loop = asyncio.SelectorEventLoop(selectors.SelectSelector())
    asyncio.set_event_loop(loop)

if __name__ == "__main__":
    config = Config(
        app="main:app",
        host="0.0.0.0",
        port=8000,
        loop="none",  # usa el loop que ya configuramos arriba
        reload=False,
    )
    server = Server(config)
    loop.run_until_complete(server.serve())
