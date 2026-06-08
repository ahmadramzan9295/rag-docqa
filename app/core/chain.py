"""
LangChain RAG chain.

- ConversationalRetrievalChain with buffer memory.
- Source citations extracted from retrieved chunks.
- Optional document summarization via map-reduce.
- LLM provider switch: Anthropic Claude ↔ OpenAI GPT.
"""
from __future__ import annotations

import re
from typing import Any

import structlog
from langchain.chains import ConversationalRetrievalChain, MapReduceDocumentsChain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains.llm import LLMChain
from langchain.chains.summarize import load_summarize_chain
from langchain.memory import ConversationBufferWindowMemory
from langchain_core.documents import Document
from langchain_core.language_models import BaseLLM
from langchain_core.prompts import ChatPromptTemplate, PromptTemplate

from app.config import settings

log = structlog.get_logger()

# ── system prompts ────────────────────────────────────────────────────────────

QA_SYSTEM = """You are a precise document assistant. Answer the user's question \
using ONLY the provided context. If the answer cannot be found in the context, \
say exactly: "I don't have enough information in the uploaded documents to answer that."

Rules:
- Be concise and factual.
- Quote exact phrases from the source when helpful.
- Do NOT make up information not in the context.
- Cite the document name and page when possible.

Context:
{context}"""

CONDENSE_QUESTION_PROMPT = PromptTemplate.from_template(
    """Given the following conversation and a follow-up question, rephrase the \
follow-up question to be a standalone question.

Chat History:
{chat_history}

Follow-up: {question}
Standalone question:"""
)

SUMMARIZE_MAP = PromptTemplate.from_template(
    "Summarise the following text concisely:\n\n{text}\n\nSummary:"
)

SUMMARIZE_COMBINE = PromptTemplate.from_template(
    "Combine these summaries into a single coherent summary:\n\n{text}\n\nFinal summary:"
)

# ── LLM factory ───────────────────────────────────────────────────────────────

def _build_llm() -> BaseLLM:
    if settings.llm_provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model=settings.llm_model,
            anthropic_api_key=settings.anthropic_api_key,
            temperature=0.1,
            max_tokens=2048,
        )
    elif settings.llm_provider == "openrouter":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=settings.llm_model,
            openai_api_key=settings.openrouter_api_key,
            openai_api_base="https://openrouter.ai/api/v1",
            temperature=0.1,
            max_tokens=2048,
        )
    else:
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=settings.llm_model,
            openai_api_key=settings.openai_api_key,
            temperature=0.1,
            max_tokens=2048,
        )


# ── source formatting ─────────────────────────────────────────────────────────

def _format_sources(docs: list[Document]) -> list[dict]:
    seen = set()
    sources = []
    for doc in docs:
        meta = doc.metadata
        key = (meta.get("source", ""), meta.get("page", ""))
        if key in seen:
            continue
        seen.add(key)
        snippet = doc.page_content[:300].replace("\n", " ")
        sources.append({
            "source": meta.get("source", "unknown"),
            "page": meta.get("page"),
            "snippet": snippet + ("…" if len(doc.page_content) > 300 else ""),
        })
    return sources


# ── main chain ────────────────────────────────────────────────────────────────

class RAGChain:
    """
    Wraps a ConversationalRetrievalChain with per-session memory.
    Create one instance per user session (or share if single-user).
    """

    def __init__(self, retriever) -> None:
        self._llm = _build_llm()
        self._retriever = retriever
        self._memory = ConversationBufferWindowMemory(
            memory_key="chat_history",
            return_messages=True,
            output_key="answer",
            k=10,  # keep last 10 exchanges
        )
        qa_prompt = ChatPromptTemplate.from_messages([
            ("system", QA_SYSTEM),
            ("human", "{question}"),
        ])
        self._chain = ConversationalRetrievalChain.from_llm(
            llm=self._llm,
            retriever=self._retriever,
            memory=self._memory,
            condense_question_prompt=CONDENSE_QUESTION_PROMPT,
            return_source_documents=True,
            output_key="answer",
            verbose=False,
        )

    def ask(self, question: str) -> dict[str, Any]:
        """Run a question through the chain and return answer + sources."""
        log.info("rag_query", question=question[:80])
        result = self._chain.invoke({"question": question})
        sources = _format_sources(result.get("source_documents", []))
        log.info("rag_answer", answer_len=len(result["answer"]), sources=len(sources))
        return {
            "answer": result["answer"],
            "sources": sources,
        }

    def clear_memory(self) -> None:
        self._memory.clear()


# ── summarization chain ───────────────────────────────────────────────────────

def summarize_documents(docs: list[Document]) -> str:
    """Map-reduce summarization – works on large documents."""
    llm = _build_llm()
    chain = load_summarize_chain(
        llm,
        chain_type="map_reduce",
        map_prompt=SUMMARIZE_MAP,
        combine_prompt=SUMMARIZE_COMBINE,
        verbose=False,
    )
    result = chain.invoke({"input_documents": docs})
    return result["output_text"]


# ── session registry ──────────────────────────────────────────────────────────

_sessions: dict[str, RAGChain] = {}


def get_or_create_session(session_id: str, retriever) -> RAGChain:
    if session_id not in _sessions:
        _sessions[session_id] = RAGChain(retriever)
        log.info("session_created", session_id=session_id)
    return _sessions[session_id]


def clear_session(session_id: str) -> None:
    if session_id in _sessions:
        _sessions[session_id].clear_memory()
        del _sessions[session_id]
