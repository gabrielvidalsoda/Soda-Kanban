import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def send_email(to_email: str, subject: str, body: str) -> None:
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not set; skipping email to %s", to_email)
        return

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.resend_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": settings.from_email,
                "to": [to_email],
                "subject": subject,
                "text": body,
            },
            timeout=30.0,
        )
        if response.status_code >= 400:
            logger.error("Resend API error %s: %s", response.status_code, response.text)
            raise RuntimeError(f"Failed to send email: {response.text}")
