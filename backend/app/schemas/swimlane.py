from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

SwimlaneCriteriaType = Literal["priority", "column", "dueStatus"]


class SwimlaneResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    boardId: str
    name: str
    criteriaType: SwimlaneCriteriaType
    criteriaValue: str
    createdAt: str


class SwimlaneCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    criteriaType: SwimlaneCriteriaType
    criteriaValue: str = Field(min_length=1, max_length=120)

    @field_validator("name", "criteriaValue")
    @classmethod
    def normalize_values(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Value cannot be empty")
        return stripped


class SwimlaneUpdateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    criteriaType: SwimlaneCriteriaType
    criteriaValue: str = Field(min_length=1, max_length=120)

    @field_validator("name", "criteriaValue")
    @classmethod
    def normalize_values(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Value cannot be empty")
        return stripped
