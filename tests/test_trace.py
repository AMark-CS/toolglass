"""Unit tests for TraceCollector."""

import pytest


class TestTraceCollector:
    """Test trace and span lifecycle in SQLite."""

    @pytest.mark.asyncio
    async def test_create_and_get_trace(self, collector):
        """Create a trace and retrieve it."""
        trace_id = await collector.create_trace(
            conversation_id="conv-1",
            root_span_type="mcp.tool.call",
            root_span_name="search",
        )

        result = await collector.get_trace(trace_id)
        assert result is not None

        trace, spans = result
        assert trace["id"] == trace_id
        assert trace["conversation_id"] == "conv-1"
        assert trace["span_count"] == 0
        assert spans == []

    @pytest.mark.asyncio
    async def test_start_and_finish_span(self, collector):
        """Start a span, finish it, and verify it's stored."""
        trace_id = await collector.create_trace()

        span_id = await collector.start_span(
            trace_id=trace_id,
            span_type="mcp.tool.call",
            mcp_server_name="test-server",
            mcp_request_method="tools/call",
            tool_name="echo",
            tool_arguments={"message": "hello"},
        )

        await collector.finish_span(
            span_id=span_id,
            latency_ms=42.5,
            result_size_bytes=100,
            result_is_error=False,
        )

        await collector.finalize_trace(trace_id)

        _, spans = await collector.get_trace(trace_id)
        assert len(spans) == 1

        span = spans[0]
        assert span["span_type"] == "mcp.tool.call"
        assert span["mcp_server_name"] == "test-server"
        assert span["tool_name"] == "echo"
        assert span["latency_ms"] == 42.5
        assert span["result_size_bytes"] == 100
        assert span["result_is_error"] == 0
        assert span["status"] == "ok"

    @pytest.mark.asyncio
    async def test_error_span(self, collector):
        """Test span that records an error."""
        trace_id = await collector.create_trace()

        span_id = await collector.start_span(
            trace_id=trace_id,
            span_type="mcp.tool.call",
            mcp_server_name="bad-server",
            tool_name="crash",
        )

        await collector.finish_span(
            span_id=span_id,
            latency_ms=100.0,
            result_is_error=True,
            status="error",
        )

        await collector.finalize_trace(trace_id)

        _, spans = await collector.get_trace(trace_id)
        span = spans[0]
        assert span["result_is_error"] == 1
        assert span["status"] == "error"

    @pytest.mark.asyncio
    async def test_list_traces(self, collector):
        """Test listing traces with filters."""
        # Create a few traces
        t1 = await collector.create_trace()
        await collector.start_span(
            trace_id=t1,
            span_type="mcp.tool.call",
            mcp_server_name="github",
            tool_name="search",
        )
        await collector.finalize_trace(t1)

        t2 = await collector.create_trace()
        await collector.start_span(
            trace_id=t2,
            span_type="mcp.tool.call",
            mcp_server_name="slack",
            tool_name="send_message",
        )
        await collector.finalize_trace(t2)

        # List all
        traces = await collector.list_traces(limit=10)
        assert len(traces) == 2

        # Filter by server
        traces = await collector.list_traces(
            limit=10,
            mcp_server="github",
        )
        assert len(traces) == 1

    @pytest.mark.asyncio
    async def test_mcp_server_stats(self, collector):
        """Test MCP server stats aggregation."""
        trace_id = await collector.create_trace()

        # Add two spans from different servers
        for server, tool, latency, size, is_error in [
            ("github", "search", 50.0, 1000, False),
            ("github", "read_file", 100.0, 5000, False),
            ("slack", "send_message", 200.0, 200, True),
        ]:
            sid = await collector.start_span(
                trace_id=trace_id,
                span_type="mcp.tool.call",
                mcp_server_name=server,
                tool_name=tool,
            )
            await collector.finish_span(
                span_id=sid,
                latency_ms=latency,
                result_size_bytes=size,
                result_is_error=is_error,
            )

        await collector.finalize_trace(trace_id)

        stats = await collector.get_mcp_server_stats()

        # github should have 2 calls, slack 1
        github = next(
            s for s in stats if s["mcp_server_name"] == "github"
        )
        slack = next(
            s for s in stats if s["mcp_server_name"] == "slack"
        )

        assert github["call_count"] == 2
        assert github["avg_latency_ms"] == 75.0  # (50+100)/2
        assert github["error_count"] == 0

        assert slack["call_count"] == 1
        assert slack["error_count"] == 1

    @pytest.mark.asyncio
    async def test_cleanup_old_traces(self, collector):
        """Test that old traces are deleted."""
        trace_id = await collector.create_trace()
        await collector.start_span(
            trace_id=trace_id,
            span_type="mcp.tool.call",
            mcp_server_name="test",
            tool_name="echo",
        )

        # Delete with 0 days retention (deletes all)
        deleted = await collector.cleanup_old_traces(retention_days=0)
        assert deleted == 1

        result = await collector.get_trace(trace_id)
        assert result is None

    @pytest.mark.asyncio
    async def test_tool_stats(self, collector):
        """Test tool stats aggregation."""
        trace_id = await collector.create_trace()

        for tool_name, latency in [("echo", 10.0), ("echo", 20.0), ("search", 50.0)]:
            sid = await collector.start_span(
                trace_id=trace_id,
                span_type="mcp.tool.call",
                mcp_server_name="test",
                tool_name=tool_name,
            )
            await collector.finish_span(
                span_id=sid,
                latency_ms=latency,
                result_size_bytes=100,
            )

        stats = await collector.get_tool_stats()

        echo = next(s for s in stats if s["tool_name"] == "echo")
        search = next(s for s in stats if s["tool_name"] == "search")

        assert echo["call_count"] == 2
        assert echo["avg_latency_ms"] == 15.0
        assert search["call_count"] == 1
        assert search["avg_latency_ms"] == 50.0

    @pytest.mark.asyncio
    async def test_finalize_trace_computes_stats(self, collector):
        """Test that finalize_trace correctly computes summary stats."""
        trace_id = await collector.create_trace()

        sid = await collector.start_span(
            trace_id=trace_id,
            span_type="mcp.tool.call",
            mcp_server_name="github",
            tool_name="search",
        )
        await collector.finish_span(
            span_id=sid,
            latency_ms=100.0,
            result_size_bytes=500,
        )

        await collector.finalize_trace(trace_id)

        trace, _ = await collector.get_trace(trace_id)
        assert trace["span_count"] == 1
        assert trace["error_count"] == 0
        assert trace["mcp_servers"] == '["github"]'
