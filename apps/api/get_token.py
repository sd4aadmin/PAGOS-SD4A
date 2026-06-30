"""
Ejecutar UNA SOLA VEZ para obtener el refresh token de Google Drive.
Uso: python get_token.py
"""
from google_auth_oauthlib.flow import InstalledAppFlow
import json

import os
CLIENT_ID = os.environ["GOOGLE_CLIENT_ID"]
CLIENT_SECRET = os.environ["GOOGLE_CLIENT_SECRET"]

client_config = {
    "installed": {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": ["urn:ietf:wg:oauth:2.0:oob", "http://localhost"],
    }
}

SCOPES = ["https://www.googleapis.com/auth/drive"]

flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
creds = flow.run_local_server(port=8080)

print("\n✓ Autorización exitosa!")
print(f"\nREFRESH_TOKEN={creds.refresh_token}")
print(f"\nCopia ese valor al .env")
