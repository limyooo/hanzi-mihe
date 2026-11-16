import json
import os
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse

app = FastAPI(title="hanzi-mihe")
app.mount("/static", StaticFiles(directory="static"), name="static")

# 存放会话的目录（相对 main.py，而不是相对启动时的 cwd）
SESSIONS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sessions")
os.makedirs(SESSIONS_DIR, exist_ok=True)


def session_path(sid: str) -> str:
    return os.path.join(SESSIONS_DIR, f"{sid}.json")


def generate_session_id(now: datetime) -> str:
    base = now.strftime("%Y-%m-%d_%H-%M-%S")
    sid, n = base, 1
    while os.path.exists(session_path(sid)):  # 同一秒内重复创建时加后缀
        sid = f"{base}_{n}"
        n += 1
    return sid


def save_session(data: dict) -> None:
    with open(session_path(data["id"]), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_session(sid: str) -> dict:
    path = session_path(sid)
    # 防止 id 里带 ../ 之类读到目录外的文件
    if os.path.dirname(os.path.abspath(path)) != SESSIONS_DIR or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="session not found")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


@app.get("/")
def root():
    return FileResponse("static/index.html")


# 会话列表：最新的在前
@app.get("/api/sessions")
def list_sessions():
    sessions = []
    for filename in os.listdir(SESSIONS_DIR):
        if filename.endswith(".json"):
            data = load_session(filename[:-5])
            sessions.append({"id": data["id"], "name": data["name"], "created_at": data["created_at"]})
    sessions.sort(key=lambda s: s["created_at"], reverse=True)
    return sessions


# 新建会话
@app.post("/api/sessions")
def create_session():
    now = datetime.now()
    # 1. 生成会话 id / 名称
    sid = generate_session_id(now)

    # TODO: 之后换成让 AI 出第一道题
    first_riddle = "谜面：一箭穿心（打一字）"

    data = {
        "id": sid,
        "name": sid,
        "created_at": now.isoformat(),
        "messages": [{"role": "assistant", "content": first_riddle}],
    }
    # 2. 存到文件
    save_session(data)
    # 3. 返回 JSON（FastAPI 会把 dict 自动转成 JSON）
    return data


# 删除会话
@app.delete("/api/sessions/{sid}")
def delete_session(sid: str):
    load_session(sid)  # 不存在会返回 404
    os.remove(session_path(sid))
    return {"ok": True}


# 获取某个会话的消息
@app.get("/api/sessions/{sid}/messages")
def get_messages(sid: str):
    return load_session(sid)["messages"]


# TODO: POST /api/sessions/{sid}/chat  body: {message} -> {reply}（需要接 AI）


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
