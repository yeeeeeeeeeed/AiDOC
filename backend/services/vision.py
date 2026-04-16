"""Azure OpenAI Vision API 서비스"""

import os
import base64
import json
import re
import logging
from openai import AzureOpenAI

logger = logging.getLogger(__name__)

_client = None


def get_client() -> AzureOpenAI:
    global _client
    if _client is None:
        _client = AzureOpenAI(
            api_key=os.getenv("AZURE_OPENAI_VISION_API_KEY", ""),
            api_version=os.getenv("AZURE_OPENAI_VISION_API_VERSION", "2024-12-01-preview"),
            azure_endpoint=os.getenv("AZURE_OPENAI_VISION_ENDPOINT", ""),
        )
    return _client


def get_model() -> str:
    return os.getenv("AZURE_OPENAI_VISION_DEPLOYMENT_NAME", "")


def call_vision(img_bytes: bytes, system_prompt: str, user_prompt: str, max_tokens: int = 16384) -> str:
    """이미지 1장 + 프롬프트 → Vision API 호출 → 응답 텍스트 반환"""
    client = get_client()
    img_b64 = base64.b64encode(img_bytes).decode()

    response = client.chat.completions.create(
        model=get_model(),
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{img_b64}"}},
                {"type": "text", "text": user_prompt},
            ]},
        ],
        max_completion_tokens=max_tokens,
        temperature=0,
    )
    return response.choices[0].message.content.strip()


def call_vision_multi(images: list[bytes], system_prompt: str, user_prompt: str, max_tokens: int = 16384) -> str:
    """여러 이미지 + 프롬프트 → Vision API 호출"""
    client = get_client()
    content = []
    for img in images:
        img_b64 = base64.b64encode(img).decode()
        content.append({"type": "image_url", "image_url": {"url": f"data:image/png;base64,{img_b64}"}})
    content.append({"type": "text", "text": user_prompt})

    response = client.chat.completions.create(
        model=get_model(),
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": content},
        ],
        max_completion_tokens=max_tokens,
        temperature=0,
    )
    return response.choices[0].message.content.strip()


def parse_tables_json(content: str) -> list:
    """LLM 응답에서 tables JSON 배열 추출"""
    content = content.strip()

    m = re.search(r'```(?:json)?\s*\n?(.*?)```', content, re.DOTALL)
    if m:
        content = m.group(1).strip()

    start = content.find('{')
    if start >= 0:
        depth = 0
        end = start
        for i in range(start, len(content)):
            if content[i] == '{':
                depth += 1
            elif content[i] == '}':
                depth -= 1
            if depth == 0:
                end = i + 1
                break
        try:
            parsed = json.loads(content[start:end])
            if "tables" in parsed:
                return parsed["tables"]
            if "headers" in parsed and "rows" in parsed:
                return [parsed]
        except json.JSONDecodeError:
            pass

    start = content.find('[')
    if start >= 0:
        try:
            parsed = json.loads(content[start:])
            if isinstance(parsed, list) and parsed and "headers" in parsed[0]:
                return parsed
        except json.JSONDecodeError:
            pass

    return [{"title": "파싱 실패 (원문)", "headers": ["원문"], "rows": [[content[:2000]]]}]
