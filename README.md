# 汉字谜盒

```
hanzi-mihe/
├── main.py            # 后端入口（接口骨架，待实现）
├── requirements.txt
└── static/            # 前端
    ├── index.html
    ├── style.css
    └── app.js         # 顶部 USE_MOCK 控制是否使用假数据
```

## 先看前端效果
直接双击 `static/index.html`（USE_MOCK = true 时不需要后端）。

## 接后端
1. `pip install -r requirements.txt`
2. 在 `main.py` 里实现 5 个接口
3. 把 `static/app.js` 里的 `USE_MOCK` 改成 `false`
4. `uvicorn main:app --reload --port 8000`，打开 http://localhost:8000

## 接口约定

| 方法 | 路径 | 请求体 | 返回 |
|---|---|---|---|
| GET | /api/sessions | - | `[{id, name, created_at}]` |
| POST | /api/sessions | - | `{id, name, created_at, messages}` |
| DELETE | /api/sessions/{id} | - | `{ok: true}` |
| GET | /api/sessions/{id}/messages | - | `[{role, content}]` |
| POST | /api/sessions/{id}/chat | `{message}` | `{reply}` |
