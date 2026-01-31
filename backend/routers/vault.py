"""
Vault Router

Handles file storage and retrieval for the Neural Vault.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
import json

from database import get_db
from auth import get_current_user
from schemas import VaultFileCreate, VaultFileResponse, VaultFolderContents
from models import User, Team, VaultFile, Operation

router = APIRouter(prefix="/api/vault", tags=["Vault"])


@router.post("/files", response_model=VaultFileResponse, status_code=status.HTTP_201_CREATED)
async def create_file(
    file_data: VaultFileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new file in the vault"""
    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == file_data.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    # Calculate size
    content_size = len(file_data.content.encode('utf-8')) if file_data.content else 0
    json_size = len(json.dumps(file_data.content_json).encode('utf-8')) if file_data.content_json else 0

    # Determine mime type
    mime_types = {
        "pdf": "application/pdf",
        "txt": "text/plain",
        "json": "application/json",
        "md": "text/markdown",
        "html": "text/html",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    mime_type = mime_types.get(file_data.file_type, "application/octet-stream")

    vault_file = VaultFile(
        team_id=file_data.team_id,
        operation_id=file_data.operation_id,
        name=file_data.name,
        file_type=file_data.file_type,
        folder_path=file_data.folder_path,
        content=file_data.content,
        content_json=file_data.content_json,
        size_bytes=content_size + json_size,
        mime_type=mime_type,
        created_by=file_data.created_by,
        source_type=file_data.source_type,
    )

    db.add(vault_file)
    db.commit()
    db.refresh(vault_file)

    return vault_file


@router.get("/files", response_model=List[VaultFileResponse])
async def list_files(
    team_id: int,
    folder_path: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all files for a team, optionally filtered by folder"""
    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    query = db.query(VaultFile).filter(VaultFile.team_id == team_id)

    if folder_path:
        query = query.filter(VaultFile.folder_path == folder_path)

    files = query.order_by(VaultFile.created_at.desc()).all()
    return files


@router.get("/files/{file_id}", response_model=VaultFileResponse)
async def get_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific file"""
    vault_file = db.query(VaultFile).filter(VaultFile.id == file_id).first()

    if not vault_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )

    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == vault_file.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    return vault_file


@router.delete("/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a file from the vault"""
    vault_file = db.query(VaultFile).filter(VaultFile.id == file_id).first()

    if not vault_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )

    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == vault_file.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    db.delete(vault_file)
    db.commit()


@router.get("/folders", response_model=VaultFolderContents)
async def list_folder_contents(
    team_id: int,
    path: str = "/",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get contents of a folder including subfolders and files"""
    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    # Get all files for team
    all_files = db.query(VaultFile).filter(VaultFile.team_id == team_id).all()

    # Find subfolders at this path
    subfolders = set()
    files_in_folder = []

    for f in all_files:
        if f.folder_path == path:
            files_in_folder.append(f)
        elif f.folder_path.startswith(path):
            # Get immediate subfolder name
            remaining = f.folder_path[len(path):].lstrip("/")
            if remaining:
                subfolder = remaining.split("/")[0]
                subfolders.add(subfolder)

    return VaultFolderContents(
        path=path,
        folders=sorted(list(subfolders)),
        files=files_in_folder
    )


@router.get("/operation/{operation_id}/files", response_model=List[VaultFileResponse])
async def get_operation_files(
    operation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all files associated with an operation"""
    operation = db.query(Operation).filter(Operation.id == operation_id).first()

    if not operation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Operation not found"
        )

    # Verify team belongs to user
    team = db.query(Team).filter(
        Team.id == operation.team_id,
        Team.user_id == current_user.id
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    files = db.query(VaultFile).filter(VaultFile.operation_id == operation_id).all()
    return files
