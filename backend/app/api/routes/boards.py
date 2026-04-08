from __future__ import annotations

from fastapi import APIRouter, Depends, Response, status

from app.core.security import get_current_user
from app.schemas.auth import AuthUser
from app.schemas.board import BoardCreateRequest, BoardResponse, BoardSnapshotResponse, BoardUpdateRequest
from app.services.workspace_service import WorkspaceService, get_workspace_service

router = APIRouter(prefix="/boards", tags=["boards"])


@router.get("", response_model=list[BoardResponse])
def list_boards(
    current_user: AuthUser = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
) -> list[BoardResponse]:
    return workspace_service.list_boards(current_user.id)


@router.post("", response_model=BoardResponse, status_code=status.HTTP_201_CREATED)
def create_board(
    payload: BoardCreateRequest,
    current_user: AuthUser = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
) -> BoardResponse:
    return workspace_service.create_board(current_user.id, payload)


@router.get("/{board_id}", response_model=BoardResponse)
def get_board(
    board_id: str,
    current_user: AuthUser = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
) -> BoardResponse:
    return workspace_service.get_board(current_user.id, board_id)


@router.patch("/{board_id}", response_model=BoardResponse)
def update_board(
    board_id: str,
    payload: BoardUpdateRequest,
    current_user: AuthUser = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
) -> BoardResponse:
    return workspace_service.update_board(current_user.id, board_id, payload)


@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_board(
    board_id: str,
    current_user: AuthUser = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
) -> Response:
    workspace_service.delete_board(current_user.id, board_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{board_id}/snapshot", response_model=BoardSnapshotResponse)
def board_snapshot(
    board_id: str,
    current_user: AuthUser = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
) -> BoardSnapshotResponse:
    return workspace_service.get_board_snapshot(current_user.id, board_id)
