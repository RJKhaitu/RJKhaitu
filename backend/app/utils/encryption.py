import base64
import json
from cryptography.fernet import Fernet
from app.config import settings


def _get_fernet() -> Fernet:
    key = settings.ENCRYPTION_KEY.encode()
    # Fernet requires exactly 32 URL-safe base64-encoded bytes
    padded = key[:32].ljust(32, b"0")
    b64_key = base64.urlsafe_b64encode(padded)
    return Fernet(b64_key)


def encrypt_credentials(credentials: dict) -> str:
    f = _get_fernet()
    data = json.dumps(credentials).encode()
    return f.encrypt(data).decode()


def decrypt_credentials(encrypted: str) -> dict:
    f = _get_fernet()
    data = f.decrypt(encrypted.encode())
    return json.loads(data.decode())
