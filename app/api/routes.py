"""
FastAPI backend for the RAG Document QA system.

Endpoints:
  POST /auth/login          – get JWT
  POST /auth/register       – create account
  POST /documents/upload    – ingest a document
  POST /documents/summarize – summarise uploaded docs
  POST /query               – ask a question (requires auth)
  GET  /health              – liveness check
"""
from __future__ import annotations

import time
import uuid
from typing import Annotated

import structlog
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel

from app.config import settings
from app.core.chain import clear_session, get_or_create_session, summarize_documents
from app.core.loader import load_upload
from app.core.vectorstore import vector_store
from app.utils.auth import (
    authenticate_user,
    create_access_token,
    decode_token,
    register_user,
)

log = structlog.get_logger()

# ── app setup ─────────────────────────────────────────────────────────────────

app = FastAPI(
    title="RAG Document QA",
    version="1.0.0",
    docs_url="/docs" if settings.app_env == "development" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ── auth dependency ───────────────────────────────────────────────────────────

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> str:
    token_data = decode_token(token)
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token_data.username


# ── models ────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class QueryRequest(BaseModel):
    question: str
    session_id: str = ""


class QueryResponse(BaseModel):
    answer: str
    sources: list[dict]
    session_id: str
    latency_ms: float


class ProcessTextRequest(BaseModel):
    text: str
    filename: str = "pasted_text.txt"


# ── auth routes ───────────────────────────────────────────────────────────────

@app.post("/auth/login")
async def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    token = create_access_token(user["username"])
    return {"access_token": token, "token_type": "bearer"}


@app.post("/auth/register", status_code=201)
async def register(req: RegisterRequest):
    ok = register_user(req.username, req.email, req.password)
    if not ok:
        raise HTTPException(status_code=409, detail="Username already taken")
    return {"message": "User created successfully"}


# ── document routes ───────────────────────────────────────────────────────────

@app.post("/documents/upload")
@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    current_user: str = Depends(get_current_user),
):
    """Ingest a document into the vector store."""
    # Validate extension
    if not file.filename:
        raise HTTPException(400, "No filename provided")
    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in settings.allowed_ext_list:
        raise HTTPException(400, f"Unsupported file type: {ext}")

    # Validate size
    content = await file.read()
    if len(content) > settings.max_file_bytes:
        raise HTTPException(413, f"File too large (max {settings.max_file_size_mb} MB)")

    # Re-wrap as UploadFile for loader
    from io import BytesIO
    from fastapi import UploadFile as FU
    upload = FU(filename=file.filename, file=BytesIO(content))

    try:
        docs = await load_upload(upload)
        stats = vector_store.ingest(docs)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    except Exception as exc:
        log.exception("upload_error", error=str(exc))
        raise HTTPException(500, "Failed to process document")

    log.info("doc_uploaded", user=current_user, filename=file.filename, **stats)
    return {"filename": file.filename, "status": "indexed", **stats}


@app.post("/documents/summarize")
async def summarize(current_user: str = Depends(get_current_user)):
    """Summarise all currently indexed documents."""
    if not vector_store.is_ready:
        raise HTTPException(400, "No documents indexed yet")
    docs = vector_store.similarity_search("summarize", k=20)
    summary = summarize_documents(docs)
    return {"summary": summary}


@app.post("/process-text")
@app.post("/documents/process-text")
async def process_text(
    req: ProcessTextRequest,
    current_user: str = Depends(get_current_user),
):
    if not req.text.strip():
        raise HTTPException(400, "Text content cannot be empty")
    from langchain_core.documents import Document
    import hashlib
    fhash = hashlib.sha256(req.text.encode("utf-8")).hexdigest()[:16]
    doc = Document(
        page_content=req.text,
        metadata={"source": req.filename, "file_hash": fhash}
    )
    try:
        stats = vector_store.ingest([doc])
    except Exception as exc:
        log.exception("process_text_error", error=str(exc))
        raise HTTPException(500, "Failed to process text content")
    log.info("text_processed", user=current_user, filename=req.filename, **stats)
    return {"filename": req.filename, "status": "indexed", **stats}


@app.get("/documents")
async def list_documents(current_user: str = Depends(get_current_user)):
    return vector_store.list_documents()


@app.delete("/documents/{filename}")
async def delete_document(
    filename: str,
    current_user: str = Depends(get_current_user),
):
    """Delete a document and all its chunks from the vector store."""
    ok = vector_store.delete_document(filename)
    if not ok:
        raise HTTPException(404, f"Document '{filename}' not found in index")
    return {"filename": filename, "status": "deleted"}


# ── query route ───────────────────────────────────────────────────────────────

@app.post("/query", response_model=QueryResponse)
@app.post("/ask", response_model=QueryResponse)
async def query(
    req: QueryRequest,
    current_user: str = Depends(get_current_user),
):
    if not vector_store.is_ready:
        raise HTTPException(400, "No documents indexed. Please upload a document first.")

    session_id = req.session_id or str(uuid.uuid4())
    retriever = vector_store.get_retriever()
    chain = get_or_create_session(session_id, retriever)

    t0 = time.perf_counter()
    result = chain.ask(req.question)
    latency_ms = (time.perf_counter() - t0) * 1000

    log.info("query_served", user=current_user, session=session_id, ms=round(latency_ms))
    return QueryResponse(
        answer=result["answer"],
        sources=result["sources"],
        session_id=session_id,
        latency_ms=round(latency_ms, 1),
    )


@app.delete("/session/{session_id}")
async def reset_session(
    session_id: str,
    current_user: str = Depends(get_current_user),
):
    clear_session(session_id)
    return {"message": f"Session {session_id} cleared"}


# ── health ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "indexed_chunks": vector_store.doc_count,
        "llm_provider": settings.llm_provider,
    }


# ── entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.api.routes:app", host="0.0.0.0", port=8000, reload=True)
