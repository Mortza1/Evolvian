"""
File Reader Tool - Read files from the Evolvian vault.

This tool allows agents to read files that have been stored in the team's
Neural Vault. It does NOT access the filesystem directly - only vault entries.
"""

from typing import Optional
from ..base import EvolvianTool, ToolResult, ToolParameter


class FileReaderTool(EvolvianTool):
    """Read files from the team's Neural Vault."""

    name = "file_reader"
    description = "Read files from the team's vault storage. Can read text files, JSON data, and previous operation outputs."
    category = "data"
    cost_per_call = 0.0  # Free - no external API calls

    parameters = [
        ToolParameter(
            name="file_id",
            type="number",
            description="The ID of the file to read",
            required=False,
        ),
        ToolParameter(
            name="file_name",
            type="string",
            description="The name of the file to read (if file_id not provided)",
            required=False,
        ),
        ToolParameter(
            name="folder",
            type="string",
            description="Folder path to search in (e.g., '/Workflow Outputs')",
            required=False,
            default="/",
        ),
    ]

    # Database session will be injected at execution time via config
    required_config = []

    async def execute(self, params: dict, config: dict) -> ToolResult:
        file_id = params.get("file_id")
        file_name = params.get("file_name")
        folder = params.get("folder", "/")

        if not file_id and not file_name:
            return ToolResult(
                success=False,
                error="Either file_id or file_name must be provided",
            )

        # Get database session and team_id from config
        db = config.get("db")
        team_id = config.get("team_id")

        if not db or not team_id:
            return ToolResult(
                success=False,
                error="Database session and team_id must be provided in config",
            )

        try:
            from models import VaultFile

            # Query for the file
            query = db.query(VaultFile).filter(VaultFile.team_id == team_id)

            if file_id:
                query = query.filter(VaultFile.id == file_id)
            else:
                query = query.filter(VaultFile.name == file_name)
                if folder != "/":
                    query = query.filter(VaultFile.folder_path == folder)

            file = query.first()

            if not file:
                return ToolResult(
                    success=False,
                    error=f"File not found: {file_id or file_name}",
                )

            # Return file content
            content = file.content
            if file.content_json:
                content = file.content_json

            return ToolResult(
                success=True,
                output={
                    "file_id": file.id,
                    "name": file.name,
                    "file_type": file.file_type,
                    "folder": file.folder_path,
                    "content": content,
                    "size_bytes": file.size_bytes,
                    "created_by": file.created_by,
                    "created_at": file.created_at.isoformat() if file.created_at else None,
                },
            )

        except Exception as e:
            return ToolResult(
                success=False,
                error=f"Error reading file: {str(e)}",
            )


class FileListTool(EvolvianTool):
    """List files in the team's Neural Vault."""

    name = "file_list"
    description = "List files in the team's vault storage. Can filter by folder or file type."
    category = "data"
    cost_per_call = 0.0

    parameters = [
        ToolParameter(
            name="folder",
            type="string",
            description="Folder path to list (e.g., '/Workflow Outputs')",
            required=False,
            default="/",
        ),
        ToolParameter(
            name="file_type",
            type="string",
            description="Filter by file type (e.g., 'json', 'txt', 'md')",
            required=False,
        ),
        ToolParameter(
            name="limit",
            type="number",
            description="Maximum number of files to return",
            required=False,
            default=20,
        ),
    ]

    async def execute(self, params: dict, config: dict) -> ToolResult:
        folder = params.get("folder", "/")
        file_type = params.get("file_type")
        limit = min(params.get("limit", 20), 100)

        db = config.get("db")
        team_id = config.get("team_id")

        if not db or not team_id:
            return ToolResult(
                success=False,
                error="Database session and team_id must be provided in config",
            )

        try:
            from models import VaultFile

            query = db.query(VaultFile).filter(VaultFile.team_id == team_id)

            if folder != "/":
                query = query.filter(VaultFile.folder_path == folder)

            if file_type:
                query = query.filter(VaultFile.file_type == file_type)

            query = query.order_by(VaultFile.created_at.desc()).limit(limit)
            files = query.all()

            return ToolResult(
                success=True,
                output={
                    "folder": folder,
                    "count": len(files),
                    "files": [
                        {
                            "id": f.id,
                            "name": f.name,
                            "file_type": f.file_type,
                            "folder": f.folder_path,
                            "size_bytes": f.size_bytes,
                            "created_by": f.created_by,
                            "created_at": f.created_at.isoformat() if f.created_at else None,
                        }
                        for f in files
                    ],
                },
            )

        except Exception as e:
            return ToolResult(
                success=False,
                error=f"Error listing files: {str(e)}",
            )
