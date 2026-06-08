"""
Test suite for RAG Document QA.

Run: pytest tests/ -v
"""
from __future__ import annotations

import io
import uuid
from unittest.mock import MagicMock, patch

import pytest
from langchain_core.documents import Document

# ── loader tests ──────────────────────────────────────────────────────────────

class TestDocumentLoaders:
    def test_txt_loader(self):
        from app.core.loader import load_txt
        data = b"Hello world. This is a test document."
        docs = load_txt(data, "test.txt")
        assert len(docs) == 1
        assert "Hello world" in docs[0].page_content
        assert docs[0].metadata["source"] == "test.txt"

    def test_unsupported_extension_raises(self):
        from app.core.loader import load_document
        with pytest.raises(ValueError, match="Unsupported"):
            load_document(b"data", "file.xyz")

    def test_metadata_contains_hash(self):
        from app.core.loader import load_txt
        docs = load_txt(b"content", "file.txt")
        assert "file_hash" in docs[0].metadata


# ── vector store tests ────────────────────────────────────────────────────────

class TestVectorStoreManager:
    @pytest.fixture(autouse=True)
    def _patch_embeddings(self):
        """Avoid loading the real model in unit tests."""
        mock_embed = MagicMock()
        mock_embed.embed_documents.return_value = [[0.1, 0.2, 0.3]] * 10
        mock_embed.embed_query.return_value = [0.1, 0.2, 0.3]
        with patch("app.core.vectorstore.get_embeddings", return_value=mock_embed):
            yield

    def test_empty_store_not_ready(self, tmp_path):
        from app.core.vectorstore import VectorStoreManager
        with patch("app.core.vectorstore.settings") as s:
            s.faiss_index_path = tmp_path
            s.chunk_size = 512
            s.chunk_overlap = 64
            s.retriever_k = 4
            s.mmr_fetch_k = 10
            vsm = VectorStoreManager.__new__(VectorStoreManager)
            vsm._store = None
            assert not vsm.is_ready


# ── chain tests ───────────────────────────────────────────────────────────────

class TestRAGChain:
    def test_format_sources(self):
        from app.core.chain import _format_sources
        docs = [
            Document(page_content="A" * 400, metadata={"source": "doc.pdf", "page": 1}),
            Document(page_content="B" * 100, metadata={"source": "doc.pdf", "page": 1}),
            Document(page_content="C" * 50,  metadata={"source": "other.txt"}),
        ]
        sources = _format_sources(docs)
        # Deduplication: same source+page counted once
        assert len(sources) == 2
        assert sources[0]["source"] == "doc.pdf"
        # Long snippets are truncated
        assert sources[0]["snippet"].endswith("…")

    def test_session_registry(self):
        from app.core.chain import _sessions, clear_session, get_or_create_session
        mock_retriever = MagicMock()
        sid = str(uuid.uuid4())
        with patch("app.core.chain._build_llm", return_value=MagicMock()):
            with patch("app.core.chain.ConversationalRetrievalChain") as MockChain:
                MockChain.from_llm.return_value = MagicMock()
                chain = get_or_create_session(sid, mock_retriever)
                assert sid in _sessions
                clear_session(sid)
                assert sid not in _sessions


# ── auth tests ────────────────────────────────────────────────────────────────

class TestAuth:
    def test_password_round_trip(self):
        from app.utils.auth import hash_password, verify_password
        plain = "super-secret-password"
        hashed = hash_password(plain)
        assert verify_password(plain, hashed)
        assert not verify_password("wrong", hashed)

    def test_token_round_trip(self):
        from app.utils.auth import create_access_token, decode_token
        token = create_access_token("ahmad")
        data = decode_token(token)
        assert data is not None
        assert data.username == "ahmad"

    def test_tampered_token_rejected(self):
        from app.utils.auth import create_access_token, decode_token
        token = create_access_token("user") + "tampered"
        assert decode_token(token) is None

    def test_register_and_authenticate(self):
        from app.utils.auth import authenticate_user, register_user
        ok = register_user("newuser", "new@test.com", "pass123")
        assert ok
        user = authenticate_user("newuser", "pass123")
        assert user is not None
        assert authenticate_user("newuser", "wrongpass") is None


# ── FastAPI integration tests ─────────────────────────────────────────────────

class TestAPI:
    @pytest.fixture
    def client(self):
        from fastapi.testclient import TestClient
        from app.api.routes import app
        return TestClient(app)

    def test_health(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert "status" in resp.json()

    def test_login_demo_user(self, client):
        resp = client.post("/auth/login", data={"username": "demo", "password": "demo1234"})
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_login_bad_credentials(self, client):
        resp = client.post("/auth/login", data={"username": "demo", "password": "wrong"})
        assert resp.status_code == 400

    def test_query_requires_auth(self, client):
        resp = client.post("/query", json={"question": "what is this?"})
        assert resp.status_code == 401

    def test_upload_requires_auth(self, client):
        resp = client.post(
            "/documents/upload",
            files={"file": ("test.txt", b"content", "text/plain")},
        )
        assert resp.status_code == 401
