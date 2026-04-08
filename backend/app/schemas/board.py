from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.column import ColumnResponse
from app.schemas.swimlane import SwimlaneResponse
from app.schemas.task import TaskResponse


class BoardResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    description: str
    createdAt: str


class BoardCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=140)
    description: str = Field(default="", max_length=1000)

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Board title cannot be empty")
        return stripped

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str) -> str:
        return value.strip()


class BoardUpdateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=140)
    description: str = Field(default="", max_length=1000)

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Board title cannot be empty")
        return stripped

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str) -> str:
        return value.strip()


class BoardSnapshotResponse(BaseModel):
    board: BoardResponse
    columns: list[ColumnResponse]
    tasks: list[TaskResponse]
    swimlanes: list[SwimlaneResponse]
