from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

TaskPriority = Literal["low", "medium", "high"]


class TaskResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    boardId: str
    columnId: str
    title: str
    description: str
    priority: TaskPriority
    dueDate: str | None = None
    order: int
    createdAt: str


class TaskCreateRequest(BaseModel):
    columnId: str
    title: str = Field(min_length=1, max_length=180)
    description: str = Field(default="", max_length=3000)
    priority: TaskPriority = "medium"
    dueDate: str | None = None

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Task title cannot be empty")
        return stripped

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str) -> str:
        return value.strip()


class TaskUpdateRequest(BaseModel):
    columnId: str
    title: str = Field(min_length=1, max_length=180)
    description: str = Field(default="", max_length=3000)
    priority: TaskPriority
    dueDate: str | None = None

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Task title cannot be empty")
        return stripped

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str) -> str:
        return value.strip()


class TaskMoveRequest(BaseModel):
    targetColumnId: str
    targetIndex: int = Field(ge=0)
