from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ColumnResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    boardId: str
    title: str
    order: int
    createdAt: str


class ColumnCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120)

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Column title cannot be empty")
        return stripped


class ColumnUpdateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120)

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Column title cannot be empty")
        return stripped


class ColumnReorderRequest(BaseModel):
    orderedColumnIds: list[str] = Field(min_length=1)
