"""
汉字谜盒 - 后端（由你来实现）

运行：
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
然后浏览器打开 http://localhost:8000

记得把 static/app.js 顶部的 USE_MOCK 改成 false
"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI()


class ChatIn(BaseModel):
    message: str


@app.get("/api/sessions")
def list_sessions():
    # TODO: 返回 [{"id", "name", "created_at"}]，新的在前
    return []


@app.post("/api/sessions")
def create_session():
    # TODO: 新建会话，让 AI 出第一道题
    # 返回 {"id", "name", "created_at", "messages": [{"role": "assistant", "content": "..."}]}
    raise NotImplementedError


@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: str):
    # TODO: 删除会话
    return {"ok": True}


@app.get("/api/sessions/{session_id}/messages")
def get_messages(session_id: str):
    # TODO: 返回 [{"role": "user" | "assistant", "content": "..."}]
    return []


@app.post("/api/sessions/{session_id}/chat")
def chat(session_id: str, body: ChatIn):
    # TODO: 带上历史消息调用大模型，保存后返回 {"reply": "..."}
    raise NotImplementedError


# 必须放在所有 /api 路由之后，否则会把接口请求拦掉
app.mount("/", StaticFiles(directory="static", html=True), name="static")
