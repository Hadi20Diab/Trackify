from __future__ import annotations

from fastapi import APIRouter, Depends, Response, status

from app.core.security import get_current_user
from app.schemas.auth import AuthUser
from app.schemas.swimlane import (
    SwimlaneCreateRequest,
    SwimlaneResponse,
    SwimlaneUpdateRequest,
)
from app.services.workspace_service import WorkspaceService, get_workspace_service

router = APIRouter(tags=["swimlanes"])


@router.get("/boards/{board_id}/swimlanes", response_model=list[SwimlaneResponse])
def list_swimlanes(
    board_id: str,
    current_user: AuthUser = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
) -> list[SwimlaneResponse]:
    return workspace_service.list_swimlanes(current_user.id, board_id)


@router.post(
    "/boards/{board_id}/swimlanes",
    response_model=SwimlaneResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_swimlane(
    board_id: str,
    payload: SwimlaneCreateRequest,
    current_user: AuthUser = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
) -> SwimlaneResponse:
    return workspace_service.create_swimlane(current_user.id, board_id, payload)


@router.patch("/swimlanes/{swimlane_id}", response_model=SwimlaneResponse)
def update_swimlane(
    swimlane_id: str,
    payload: SwimlaneUpdateRequest,
    current_user: AuthUser = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
) -> SwimlaneResponse:
    return workspace_service.update_swimlane(current_user.id, swimlane_id, payload)


@router.delete("/swimlanes/{swimlane_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_swimlane(
    swimlane_id: str,
    current_user: AuthUser = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
) -> Response:
    workspace_service.delete_swimlane(current_user.id, swimlane_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
