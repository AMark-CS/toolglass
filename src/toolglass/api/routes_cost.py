"""Cost summary routes."""

from __future__ import annotations

from fastapi import APIRouter, Request

router = APIRouter(tags=["cost"])


@router.get("/cost/summary")
async def cost_summary(request: Request):
    """Get a high-level cost summary.

    For now this returns total spans and errors since the
    full cost attribution engine will be in Phase 2.
    """
    collector = request.app.state.collector

    servers = await collector.get_mcp_server_stats()
    tools = await collector.get_tool_stats()

    total_calls = sum(s["call_count"] for s in servers)
    total_errors = sum(s["error_count"] for s in servers)
    total_data_bytes = sum(s["total_result_bytes"] or 0 for s in servers)

    return {
        "total_tool_calls": total_calls,
        "total_errors": total_errors,
        "total_result_bytes": total_data_bytes,
        "mcp_servers": servers,
        "tools": tools,
    }
