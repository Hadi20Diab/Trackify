from __future__ import annotations

from fastapi import APIRouter, Depends, Response, status

from app.core.security import get_current_user
from app.schemas.auth import AuthUser
from app.schemas.task import TaskCreateRequest, TaskMoveRequest, TaskResponse, TaskUpdateRequest
from app.services.workspace_service import WorkspaceService, get_workspace_service

router = APIRouter(tags=["tasks"])


@router.get("/boards/{board_id}/tasks", response_model=list[TaskResponse])
def list_tasks(
    board_id: str,
    current_user: AuthUser = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
) -> list[TaskResponse]:
    return workspace_service.list_tasks(current_user.id, board_id)


@router.post("/boards/{board_id}/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    board_id: str,
    payload: TaskCreateRequest,
    current_user: AuthUser = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
) -> TaskResponse:
    return workspace_service.create_task(current_user.id, board_id, payload)


@router.patch("/tasks/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: str,
    payload: TaskUpdateRequest,
    current_user: AuthUser = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
) -> TaskResponse:
    return workspace_service.update_task(current_user.id, task_id, payload)


@router.post("/tasks/{task_id}/move", response_model=list[TaskResponse])
def move_task(
    task_id: str,
    payload: TaskMoveRequest,
    current_user: AuthUser = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
) -> list[TaskResponse]:
    return workspace_service.move_task(current_user.id, task_id, payload)


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: str,
    current_user: AuthUser = Depends(get_current_user),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
) -> Response:
    workspace_service.delete_task(current_user.id, task_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
