"""
FAISS vector store with HuggingFace embeddings.

Features:
- Singleton embedding model (load once, reuse).
- Persistent index – survives process restarts.
- Multi-document: each document's chunks carry source metadata for citation.
- MMR retriever for diverse, non-redundant context.
"""
from __future__ import annotations

import threading
from pathlib import Path
from typing import Optional

import structlog
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings

log = structlog.get_logger()

# ── Embedding singleton ───────────────────────────────────────────────────────
_embed_lock = threading.Lock()
_embeddings: Optional[HuggingFaceEmbeddings] = None


def get_embeddings() -> HuggingFaceEmbeddings:
    global _embeddings
    if _embeddings is None:
        with _embed_lock:
            if _embeddings is None:
                log.info("loading_embeddings", model=settings.embedding_model)
                _embeddings = HuggingFaceEmbeddings(
                    model_name=settings.embedding_model,
                    model_kwargs={"device": settings.embedding_device},
                    encode_kwargs={"normalize_embeddings": True},
                )
                log.info("embeddings_ready")
    return _embeddings


# ── Text splitter ─────────────────────────────────────────────────────────────

def get_splitter() -> RecursiveCharacterTextSplitter:
    return RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )


# ── Vector store manager ──────────────────────────────────────────────────────

class VectorStoreManager:
    """Thread-safe FAISS wrapper with add/search/persist capabilities."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._store: Optional[FAISS] = None
        self._index_path: Path = settings.faiss_index_path
        self._load_existing()

    # ── persistence ───────────────────────────────────────────────────────────

    def _load_existing(self) -> None:
        idx_file = self._index_path / "index.faiss"
        if idx_file.exists():
            try:
                log.info("loading_faiss_index", path=str(self._index_path))
                self._store = FAISS.load_local(
                    str(self._index_path),
                    get_embeddings(),
                    allow_dangerous_deserialization=True,
                )
                log.info("faiss_index_loaded", docs=self._store.index.ntotal)
            except Exception as exc:
                log.warning("faiss_load_failed", error=str(exc))

    def _save(self) -> None:
        if self._store:
            self._store.save_local(str(self._index_path))
            log.debug("faiss_saved")

    # ── public API ────────────────────────────────────────────────────────────

    def ingest(self, docs: list[Document]) -> dict:
        """Chunk documents and add to the vector store. Returns stats."""
        splitter = get_splitter()
        chunks = splitter.split_documents(docs)
        log.info("chunks_created", count=len(chunks))

        if not chunks:
            return {"chunks_added": 0}

        with self._lock:
            if self._store is None:
                self._store = FAISS.from_documents(chunks, get_embeddings())
            else:
                self._store.add_documents(chunks)
            self._save()

        return {
            "chunks_added": len(chunks),
            "total_indexed": self._store.index.ntotal,
        }

    def similarity_search(self, query: str, k: int | None = None) -> list[Document]:
        k = k or settings.retriever_k
        if self._store is None:
            return []
        return self._store.similarity_search(query, k=k)

    def get_retriever(self):
        """MMR retriever for diverse chunk selection."""
        if self._store is None:
            return None
        return self._store.as_retriever(
            search_type="mmr",
            search_kwargs={
                "k": settings.retriever_k,
                "fetch_k": settings.mmr_fetch_k,
            },
        )

    def list_documents(self) -> list[dict]:
        """Return a list of unique document filenames and their chunk counts."""
        if self._store is None:
            return []
        counts = {}
        for doc in self._store.docstore._dict.values():
            source = doc.metadata.get("source", "unknown")
            counts[source] = counts.get(source, 0) + 1
        return [{"filename": src, "chunks": count} for src, count in counts.items()]

    def delete_document(self, filename: str) -> bool:
        """Delete all chunks belonging to a specific filename from the index."""
        if self._store is None:
            return False
        with self._lock:
            ids_to_delete = [
                doc_id
                for doc_id, doc in self._store.docstore._dict.items()
                if doc.metadata.get("source") == filename
            ]
            if not ids_to_delete:
                return False
            self._store.delete(ids_to_delete)
            self._save()
            if self._store.index.ntotal == 0:
                self._store = None
                for f in self._index_path.glob("*"):
                    f.unlink(missing_ok=True)
                log.info("faiss_cleared_after_delete")
        log.info("document_deleted", filename=filename, chunks=len(ids_to_delete))
        return True

    def clear(self) -> None:
        """Wipe the index (for testing / user reset)."""
        with self._lock:
            self._store = None
            for f in self._index_path.glob("*"):
                f.unlink(missing_ok=True)
        log.info("faiss_cleared")

    @property
    def is_ready(self) -> bool:
        return self._store is not None and self._store.index.ntotal > 0

    @property
    def doc_count(self) -> int:
        return self._store.index.ntotal if self._store else 0


# ── global singleton ──────────────────────────────────────────────────────────
vector_store = VectorStoreManager()
