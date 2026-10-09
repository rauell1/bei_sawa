"""FastAPI entry point for the BeiSawa demo API."""

from __future__ import annotations

from contextlib import asynccontextmanager
import json
import os
from typing import Any, AsyncIterator
from uuid import uuid4

import httpx
from fastapi import FastAPI, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, Field
from starlette.responses import JSONResponse

from beisawa.approval import prepare_gate, resume_gate
from beisawa.agent import run_review
from beisawa.audit import get_audit_logger
from beisawa.config import get_settings
from beisawa.data import load_dataset
from beisawa.mcp_client import MCPGateway, MCPToolError
from beisawa.ollama import ModelOutputError, ModelUnavailableError
from beisawa.auth import authenticate_reviewer


class ReviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    record_key: str = Field(min_length=1, max_length=600)


class DraftRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    report: dict[str, Any]


async def ollama_health() -> dict[str, Any]:
    settings = get_settings()
    if settings.llm_mode in {"stub", "test"}:
        return {
            "mode": "test_stub",
            "model": "deterministic-test-stub",
            "available": True,
            "is_open_weights_model": False,
            "notice": "Test/preview mode only; run with Ollama and Qwen 2.5 for the challenge task.",
        }
    if settings.llm_mode != "ollama":
        return {
            "mode": settings.llm_mode,
            "model": settings.ollama_model,
            "available": False,
            "is_open_weights_model": False,
            "notice": f"Unsupported model mode '{settings.llm_mode}'. Configure Ollama or the explicit test stub.",
        }
    is_qwen_family = settings.ollama_model.casefold().startswith("qwen2.5:")
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(3.0, connect=1.0)) as client:
            response = await client.get(f"{settings.ollama_base_url}/api/tags")
            response.raise_for_status()
        payload = response.json()
        models = payload.get("models", [])
        installed = any(model.get("name") == settings.ollama_model for model in models)
        return {
            "mode": "ollama",
            "model": settings.ollama_model,
            "available": installed,
            "is_open_weights_model": is_qwen_family,
            "notice": (
                "The configured Qwen 2.5 tag is present in Ollama; verify its digest and run the model task."
                if installed and is_qwen_family
                else f"The configured Ollama model {settings.ollama_model} is present but is not identified as Qwen 2.5."
                if installed
                else f"Ollama is reachable but {settings.ollama_model} is not pulled yet."
            ),
        }
    except (httpx.HTTPError, ValueError) as exc:
        return {
            "mode": "ollama",
            "model": settings.ollama_model,
            "available": False,
            "is_open_weights_model": is_qwen_family,
            "notice": f"Ollama is not reachable at {settings.ollama_base_url}: {exc}. No model inference was performed.",
        }


@asynccontextmanager
async def lifespan(application: FastAPI):
    settings = get_settings()
    settings.drafts_dir.mkdir(parents=True, exist_ok=True)
    settings.audit_path.parent.mkdir(parents=True, exist_ok=True)
    async with MCPGateway(include_filesystem=True, settings=settings) as gateway:
        application.state.mcp_gateway = gateway
        try:
            yield
        finally:
            application.state.mcp_gateway = None


app = FastAPI(
    title="BeiSawa Value-for-Money Review API",
    version="0.1.0",
    description=(
        "A synthetic-data OCDS review prototype. It prepares cited review drafts only; "
        "there is no authenticated approval or procurement decision action."
    ),
    lifespan=lifespan,
)


@app.middleware("http")
async def authenticate_engine(request: Request, call_next):
    """The deployed engine independently verifies the reviewer's Neon JWT."""
    if os.getenv("BEISAWA_ENGINE_REQUIRE_AUTH") == "1":
        try:
            request.state.reviewer_id = await authenticate_reviewer(request.headers.get("authorization", ""))
        except HTTPException as exc:
            return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)
        # Never expose the engine's aggregate scratch log to an individual.
        if request.url.path == "/api/v1/audit":
            return JSONResponse({"detail": "Use your private workspace activity API"}, status_code=404)
    return await call_next(request)


@asynccontextmanager
async def _gateway_scope(
    request: Request,
    *,
    include_filesystem: bool,
    request_id: str,
) -> AsyncIterator[MCPGateway]:
    """Reuse FastAPI's long-lived MCP sessions, with a short-lived test fallback."""

    gateway = getattr(request.app.state, "mcp_gateway", None)
    if gateway is not None:
        yield gateway
    else:
        async with MCPGateway(
            include_filesystem=include_filesystem,
            request_id=request_id,
        ) as temporary_gateway:
            yield temporary_gateway


@app.get("/api/v1/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "BeiSawa Value-for-Money Review Agent",
        "data_provenance": load_dataset().get("provenance", "unverified_source"),
        "mcp_servers": {
            "bei_sawa": "own MCP server (4 tools)",
            "filesystem": "upstream MCP filesystem package; application calls read_text_file only",
        },
        "model": await ollama_health(),
        "policy": "Drafts only; no award/reject/cancel/publish actions exist.",
    }


@app.get("/api/v1/tenders")
async def list_tenders(
    request: Request,
    q: str = Query(default="", max_length=200),
    limit: int = Query(default=20, ge=1, le=50),
) -> dict[str, Any]:
    request_id = str(uuid4())
    try:
        async with _gateway_scope(
            request,
            include_filesystem=False,
            request_id=request_id,
        ) as gateway:
            result = await gateway.call(
                "bei_sawa",
                "search_tenders",
                {"query": q, "limit": limit},
                request_id=request_id,
            )
    except (MCPToolError, OSError) as exc:
        raise HTTPException(status_code=502, detail=f"MCP search failed: {exc}") from exc
    return result


@app.post("/api/v1/reviews")
async def review_tender(payload: ReviewRequest, request: Request) -> dict[str, Any]:
    request_id = str(uuid4())
    try:
        async with _gateway_scope(
            request,
            include_filesystem=True,
            request_id=request_id,
        ) as gateway:
            result = await run_review(
                payload.record_key,
                request_id=request_id,
                gateway=gateway,
            )
            result["audit_events"] = get_audit_logger().for_request(request_id)
            return result
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ModelUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ModelOutputError as exc:
        raise HTTPException(status_code=502, detail=f"The local model response failed validation: {exc}") from exc
    except (MCPToolError, OSError, RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=502, detail=f"Review workflow failed: {exc}") from exc


@app.post("/api/v1/drafts")
async def save_draft(payload: DraftRequest, request: Request) -> dict[str, Any]:
    record_key = payload.report.get("record_key")
    if not isinstance(record_key, str):
        raise HTTPException(status_code=422, detail="The report must include its dataset-scoped record_key.")
    try:
        request_id = str(uuid4())
        async with _gateway_scope(
            request,
            include_filesystem=False,
            request_id=request_id,
        ) as gateway:
            result = await gateway.call(
                "bei_sawa",
                "draft_review_memo",
                {"record_key": record_key, "report_json": json.dumps(payload.report)},
                request_id=request_id,
            )
    except (MCPToolError, OSError) as exc:
        raise HTTPException(status_code=502, detail=f"Draft MCP tool failed: {exc}") from exc
    if isinstance(result, dict) and result.get("error"):
        status = 422 if result["error"] in {"draft_rejected", "record_mismatch", "invalid_report_json"} else 404
        raise HTTPException(status_code=status, detail=result.get("message", result["error"]))
    result["audit_events"] = get_audit_logger().for_request(request_id)
    return result


@app.get("/api/v1/audit")
async def audit_events(limit: int = Query(default=50, ge=1, le=200)) -> dict[str, Any]:
    events = get_audit_logger().recent(limit)
    return {"events": events, "count": len(events), "log_format": "JSON Lines; append-only local audit trail"}


class GateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    draft_id: str = Field(pattern=r"^draft-[a-f0-9]{32}$")
    content_hash: str = Field(pattern=r"^[a-f0-9]{64}$")


class GateResumeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    checkpoint: dict[str, Any]
    approval: dict[str, Any]


@app.post("/internal/approval/prepare")
def prepare_approval(payload: GateRequest, request: Request):
    return prepare_gate(payload.draft_id, payload.content_hash, getattr(request.state, "reviewer_id", "local-preview"))


@app.post("/internal/approval/resume")
def resume_approval(payload: GateResumeRequest, request: Request):
    # This returns graph state only: it cannot approve or file database reports.
    # The Neon API supplies its persisted approval after independently checking it.
    try:
        return resume_gate(payload.checkpoint, payload.approval, getattr(request.state, "reviewer_id", "local-preview"))
    except (ValueError, KeyError, TypeError) as exc:
        raise HTTPException(status_code=422, detail="Approval checkpoint does not match") from exc
