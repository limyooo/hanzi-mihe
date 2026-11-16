from fastapi import FastAPI
from starlette.responses import FileResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="hanzi-mihe")
app.mount("/static",StaticFiles(directory="static"),name="static")

@app.get("/")
def root():
    print("view the first page")
    return FileResponse("static/index.html")

if __name__ =="__main__":
    import uvicorn
    uvicorn.run(app,host="0.0.0.0",port=8000)

