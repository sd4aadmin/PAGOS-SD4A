"""
Google Drive service — usa Service Account para autenticación permanente.
"""
import io
import json
import os

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload, MediaIoBaseUpload

from core.config import settings

SCOPES = ["https://www.googleapis.com/auth/drive"]

_cached_service = None


def _get_service():
    global _cached_service
    if _cached_service is not None:
        return _cached_service

    # Opción 1: JSON completo en variable de entorno (Railway)
    sa_json = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON")
    if sa_json:
        info = json.loads(sa_json)
        creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
    else:
        # Opción 2: archivo local (desarrollo)
        sa_path = os.path.join(os.path.dirname(__file__), "..", "sd4a-service-account.json")
        creds = service_account.Credentials.from_service_account_file(sa_path, scopes=SCOPES)

    _cached_service = build("drive", "v3", credentials=creds, cache_discovery=False)
    return _cached_service


SUBCARPETAS = [
    "01_MEMORIAS",
    "02_PLANOS",
    "03_CALCULOS",
    "04_LICENCIAS",
    "05_FOTOGRAFIAS",
    "06_MODELOS_BIM",
    "07_RESPALDOS",
]


def _create_folder(name: str, parent_id: str) -> str:
    svc = _get_service()
    meta = {
        "name": name,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [parent_id],
    }
    return svc.files().create(body=meta, fields="id").execute()["id"]


def create_project_folder(project_code: str, project_name: str) -> tuple[str, dict[str, str]]:
    root_id = _create_folder(project_name, settings.GOOGLE_DRIVE_ROOT_FOLDER)
    subfolders: dict[str, str] = {}
    for sub in SUBCARPETAS:
        subfolders[sub] = _create_folder(sub, root_id)
    return root_id, subfolders


def list_files(folder_id: str) -> list[dict]:
    svc = _get_service()
    result = svc.files().list(
        q=f"'{folder_id}' in parents and trashed=false",
        fields="files(id, name, mimeType, size, createdTime, webViewLink, webContentLink)",
        orderBy="createdTime desc",
    ).execute()
    return result.get("files", [])


def upload_file(folder_id: str, filename: str, content: bytes, mime_type: str) -> dict:
    svc = _get_service()
    meta = {"name": filename, "parents": [folder_id]}
    media = MediaIoBaseUpload(io.BytesIO(content), mimetype=mime_type, resumable=False)
    return svc.files().create(
        body=meta, media_body=media,
        fields="id, name, mimeType, size, createdTime, webViewLink, webContentLink",
    ).execute()


def delete_file(file_id: str) -> None:
    svc = _get_service()
    svc.files().delete(fileId=file_id).execute()


def download_file(file_id: str) -> tuple[bytes, str]:
    svc = _get_service()
    meta = svc.files().get(fileId=file_id, fields="name, mimeType").execute()
    request = svc.files().get_media(fileId=file_id)
    buf = io.BytesIO()
    downloader = MediaIoBaseDownload(buf, request)
    done = False
    while not done:
        _, done = downloader.next_chunk()
    return buf.getvalue(), meta["name"]


def get_file_metadata(file_id: str) -> dict:
    svc = _get_service()
    return svc.files().get(
        fileId=file_id,
        fields="id, name, mimeType, size, createdTime, webViewLink, webContentLink",
    ).execute()
