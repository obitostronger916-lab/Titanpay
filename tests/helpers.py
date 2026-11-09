import hashlib
import hmac
import json
import time
from urllib.parse import urlencode


def make_init_data(user_id: int, token: str = "123456:TESTTOKEN", age: int = 0, tamper: bool = False) -> str:
    user = json.dumps({"id": user_id, "first_name": "Test", "username": f"u{user_id}"})
    pairs = {"auth_date": str(int(time.time()) - age), "user": user}
    check = "\n".join(f"{k}={v}" for k, v in sorted(pairs.items()))
    secret = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
    h = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    if tamper:
        pairs["user"] = json.dumps({"id": 111, "first_name": "Hacker"})  # admin ID'ga almashtirish urinishi
    return urlencode({**pairs, "hash": h})
