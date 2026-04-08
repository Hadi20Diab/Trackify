from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.schemas.auth import AuthUser
from app.schemas.column import (
    ColumnCreateRequest,
    ColumnReorderRequest,
    ColumnResponse,
    ColumnUpdateRequest,
)
from app.services.workspace_service import WorkspaceService, get_workspace_service

router = APIRouter(tags=["columns"])


@router.get("/boards/{board_id}/columns", response_model=list[ColumnResponse])
def list_columns(
    board_id: str,
    current_user: AuthUser = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
) -> list[ColumnResponse]:
    return workspace_service.list_columns(current_user.id, board_id)


@router.post("/boards/{board_id}/columns", response_model=ColumnResponse)
def create_column(
    board_id: str,
    payload: ColumnCreateRequest,
    current_user: AuthUser = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
) -> ColumnResponse:
    return workspace_service.create_column(current_user.id, board_id, payload)


@router.patch("/columns/{column_id}", response_model=ColumnResponse)
def update_column(
    column_id: str,
    payload: ColumnUpdateRequest,
    current_user: AuthUser = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
) -> ColumnResponse:
    return workspace_service.update_column(current_user.id, column_id, payload)


@router.post("/boards/{board_id}/columns/reorder", response_model=list[ColumnResponse])
def reorder_columns(
    board_id: str,
    payload: ColumnReorderRequest,
    current_user: AuthUser = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
) -> list[ColumnResponse]:
    return workspace_service.reorder_columns(current_user.id, board_id, payload)


@router.delete("/boards/{board_id}/columns/{column_id}", response_model=list[ColumnResponse])
def delete_column(
    board_id: str,
    column_id: str,
    current_user: AuthUser = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
) -> list[ColumnResponse]:
    return workspace_service.delete_column(current_user.id, board_id, column_id)
