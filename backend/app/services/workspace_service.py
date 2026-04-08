from __future__ import annotations

from datetime import date

from fastapi import HTTPException, status
from supabase import Client

from app.core.supabase import create_supabase_admin_client
from app.schemas.board import BoardCreateRequest, BoardResponse, BoardSnapshotResponse, BoardUpdateRequest
from app.schemas.column import (
    ColumnCreateRequest,
    ColumnReorderRequest,
    ColumnResponse,
    ColumnUpdateRequest,
)
from app.schemas.swimlane import SwimlaneCreateRequest, SwimlaneResponse, SwimlaneUpdateRequest
from app.schemas.task import TaskCreateRequest, TaskMoveRequest, TaskResponse, TaskUpdateRequest

DEFAULT_COLUMN_TITLES = ["To Do", "In Progress", "Done"]


class WorkspaceService:
    def __init__(self, client: Client) -> None:
        self.client = client

    # Boards
    def list_boards(self, owner_id: str) -> list[BoardResponse]:
        rows = self._rows(
            self.client.table("boards")
            .select("id,title,description,created_at")
            .eq("owner_id", owner_id)
            .order("created_at", desc=True)
            .execute()
        )
        return [self._map_board(row) for row in rows]

    def create_board(self, owner_id: str, payload: BoardCreateRequest) -> BoardResponse:
        rows = self._rows(
            self.client.table("boards")
            .insert(
                {
                    "owner_id": owner_id,
                    "title": payload.title,
                    "description": payload.description,
                }
            )
            .execute()
        )
        board_row = self._single_or_error(rows, "Failed to create board.")

        default_columns = [
            {
                "owner_id": owner_id,
                "board_id": board_row["id"],
                "title": title,
                "position": index,
            }
            for index, title in enumerate(DEFAULT_COLUMN_TITLES)
        ]
        self.client.table("columns").insert(default_columns).execute()

        return self._map_board(board_row)

    def get_board(self, owner_id: str, board_id: str) -> BoardResponse:
        row = self._get_board_row(owner_id, board_id)
        return self._map_board(row)

    def update_board(self, owner_id: str, board_id: str, payload: BoardUpdateRequest) -> BoardResponse:
        self._get_board_row(owner_id, board_id)
        self.client.table("boards").update(
            {
                "title": payload.title,
                "description": payload.description,
            }
        ).eq("id", board_id).eq("owner_id", owner_id).execute()

        return self.get_board(owner_id, board_id)

    def delete_board(self, owner_id: str, board_id: str) -> None:
        self._get_board_row(owner_id, board_id)
        self.client.table("boards").delete().eq("id", board_id).eq("owner_id", owner_id).execute()

    def get_board_snapshot(self, owner_id: str, board_id: str) -> BoardSnapshotResponse:
        board = self.get_board(owner_id, board_id)
        columns = self.list_columns(owner_id, board_id)
        tasks = self.list_tasks(owner_id, board_id)
        swimlanes = self.list_swimlanes(owner_id, board_id)

        return BoardSnapshotResponse(board=board, columns=columns, tasks=tasks, swimlanes=swimlanes)

    # Columns
    def list_columns(self, owner_id: str, board_id: str) -> list[ColumnResponse]:
        self._get_board_row(owner_id, board_id)
        rows = self._rows(
            self.client.table("columns")
            .select("id,board_id,title,position,created_at")
            .eq("owner_id", owner_id)
            .eq("board_id", board_id)
            .order("position")
            .execute()
        )
        return [self._map_column(row) for row in rows]

    def create_column(self, owner_id: str, board_id: str, payload: ColumnCreateRequest) -> ColumnResponse:
        self._get_board_row(owner_id, board_id)
        max_position = self._get_next_column_position(owner_id, board_id)

        rows = self._rows(
            self.client.table("columns")
            .insert(
                {
                    "owner_id": owner_id,
                    "board_id": board_id,
                    "title": payload.title,
                    "position": max_position,
                }
            )
            .execute()
        )

        return self._map_column(self._single_or_error(rows, "Failed to create column."))

    def update_column(self, owner_id: str, column_id: str, payload: ColumnUpdateRequest) -> ColumnResponse:
        column = self._get_column_row(owner_id, column_id)
        self.client.table("columns").update({"title": payload.title}).eq("id", column_id).eq(
            "owner_id", owner_id
        ).execute()
        column["title"] = payload.title
        return self._map_column(column)

    def reorder_columns(
        self, owner_id: str, board_id: str, payload: ColumnReorderRequest
    ) -> list[ColumnResponse]:
        existing_rows = self._rows(
            self.client.table("columns")
            .select("id")
            .eq("owner_id", owner_id)
            .eq("board_id", board_id)
            .execute()
        )
        existing_ids = {row["id"] for row in existing_rows}
        ordered_ids = payload.orderedColumnIds

        if set(ordered_ids) != existing_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="orderedColumnIds must include every board column exactly once.",
            )

        for index, column_id in enumerate(ordered_ids):
            self.client.table("columns").update({"position": index}).eq("id", column_id).eq(
                "owner_id", owner_id
            ).execute()

        return self.list_columns(owner_id, board_id)

    def delete_column(self, owner_id: str, board_id: str, column_id: str) -> list[ColumnResponse]:
        target_column = self._get_column_row(owner_id, column_id)
        if target_column["board_id"] != board_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Column not found.")

        all_columns = self._rows(
            self.client.table("columns")
            .select("id,position")
            .eq("owner_id", owner_id)
            .eq("board_id", board_id)
            .order("position")
            .execute()
        )

        fallback_column = next((row for row in all_columns if row["id"] != column_id), None)
        if fallback_column is not None:
            self._move_tasks_to_column(owner_id, board_id, column_id, fallback_column["id"])
        else:
            self.client.table("tasks").delete().eq("owner_id", owner_id).eq("board_id", board_id).eq(
                "column_id", column_id
            ).execute()

        self.client.table("columns").delete().eq("id", column_id).eq("owner_id", owner_id).execute()

        remaining_columns = self._rows(
            self.client.table("columns")
            .select("id")
            .eq("owner_id", owner_id)
            .eq("board_id", board_id)
            .order("position")
            .execute()
        )

        for index, row in enumerate(remaining_columns):
            self.client.table("columns").update({"position": index}).eq("id", row["id"]).eq(
                "owner_id", owner_id
            ).execute()

        return self.list_columns(owner_id, board_id)

    # Tasks
    def list_tasks(self, owner_id: str, board_id: str) -> list[TaskResponse]:
        self._get_board_row(owner_id, board_id)
        rows = self._rows(
            self.client.table("tasks")
            .select("id,board_id,column_id,title,description,priority,due_date,position,created_at")
            .eq("owner_id", owner_id)
            .eq("board_id", board_id)
            .order("column_id")
            .order("position")
            .execute()
        )
        return [self._map_task(row) for row in rows]

    def create_task(self, owner_id: str, board_id: str, payload: TaskCreateRequest) -> TaskResponse:
        self._get_board_row(owner_id, board_id)
        self._assert_column_in_board(owner_id, board_id, payload.columnId)

        due_date = self._normalize_due_date(payload.dueDate)
        next_position = self._get_next_task_position(owner_id, board_id, payload.columnId)

        rows = self._rows(
            self.client.table("tasks")
            .insert(
                {
                    "owner_id": owner_id,
                    "board_id": board_id,
                    "column_id": payload.columnId,
                    "title": payload.title,
                    "description": payload.description,
                    "priority": payload.priority,
                    "due_date": due_date,
                    "position": next_position,
                }
            )
            .execute()
        )

        return self._map_task(self._single_or_error(rows, "Failed to create task."))

    def update_task(self, owner_id: str, task_id: str, payload: TaskUpdateRequest) -> TaskResponse:
        current_task = self._get_task_row(owner_id, task_id)
        self._assert_column_in_board(owner_id, current_task["board_id"], payload.columnId)

        due_date = self._normalize_due_date(payload.dueDate)
        target_column_id = payload.columnId

        if current_task["column_id"] != target_column_id:
            new_position = self._get_next_task_position(owner_id, current_task["board_id"], target_column_id)
        else:
            new_position = current_task["position"]

        self.client.table("tasks").update(
            {
                "column_id": target_column_id,
                "title": payload.title,
                "description": payload.description,
                "priority": payload.priority,
                "due_date": due_date,
                "position": new_position,
            }
        ).eq("id", task_id).eq("owner_id", owner_id).execute()

        updated_row = self._get_task_row(owner_id, task_id)
        self._normalize_task_positions(owner_id, updated_row["board_id"], current_task["column_id"])
        if current_task["column_id"] != target_column_id:
            self._normalize_task_positions(owner_id, updated_row["board_id"], target_column_id)

        return self._map_task(self._get_task_row(owner_id, task_id))

    def delete_task(self, owner_id: str, task_id: str) -> None:
        task = self._get_task_row(owner_id, task_id)
        self.client.table("tasks").delete().eq("id", task_id).eq("owner_id", owner_id).execute()
        self._normalize_task_positions(owner_id, task["board_id"], task["column_id"])

    def move_task(self, owner_id: str, task_id: str, payload: TaskMoveRequest) -> list[TaskResponse]:
        moving_task = self._get_task_row(owner_id, task_id)
        board_id = moving_task["board_id"]
        source_column_id = moving_task["column_id"]
        target_column_id = payload.targetColumnId

        self._assert_column_in_board(owner_id, board_id, target_column_id)

        source_tasks = self._rows(
            self.client.table("tasks")
            .select("id")
            .eq("owner_id", owner_id)
            .eq("board_id", board_id)
            .eq("column_id", source_column_id)
            .order("position")
            .execute()
        )
        source_ids = [row["id"] for row in source_tasks if row["id"] != task_id]

        if source_column_id == target_column_id:
            safe_index = max(0, min(payload.targetIndex, len(source_ids)))
            source_ids.insert(safe_index, task_id)
            for index, row_id in enumerate(source_ids):
                self.client.table("tasks").update({"position": index}).eq("id", row_id).eq(
                    "owner_id", owner_id
                ).execute()
            return self.list_tasks(owner_id, board_id)

        target_tasks = self._rows(
            self.client.table("tasks")
            .select("id")
            .eq("owner_id", owner_id)
            .eq("board_id", board_id)
            .eq("column_id", target_column_id)
            .order("position")
            .execute()
        )
        target_ids = [row["id"] for row in target_tasks]
        safe_index = max(0, min(payload.targetIndex, len(target_ids)))
        target_ids.insert(safe_index, task_id)

        self.client.table("tasks").update({"column_id": target_column_id}).eq("id", task_id).eq(
            "owner_id", owner_id
        ).execute()

        for index, row_id in enumerate(source_ids):
            self.client.table("tasks").update({"position": index}).eq("id", row_id).eq(
                "owner_id", owner_id
            ).execute()

        for index, row_id in enumerate(target_ids):
            self.client.table("tasks").update({"position": index}).eq("id", row_id).eq(
                "owner_id", owner_id
            ).execute()

        return self.list_tasks(owner_id, board_id)

    # Swimlanes
    def list_swimlanes(self, owner_id: str, board_id: str) -> list[SwimlaneResponse]:
        self._get_board_row(owner_id, board_id)
        rows = self._rows(
            self.client.table("swimlanes")
            .select("id,board_id,name,criteria_type,criteria_value,created_at")
            .eq("owner_id", owner_id)
            .eq("board_id", board_id)
            .order("created_at")
            .execute()
        )
        return [self._map_swimlane(row) for row in rows]

    def create_swimlane(
        self, owner_id: str, board_id: str, payload: SwimlaneCreateRequest
    ) -> SwimlaneResponse:
        self._get_board_row(owner_id, board_id)
        rows = self._rows(
            self.client.table("swimlanes")
            .insert(
                {
                    "owner_id": owner_id,
                    "board_id": board_id,
                    "name": payload.name,
                    "criteria_type": payload.criteriaType,
                    "criteria_value": payload.criteriaValue,
                }
            )
            .execute()
        )
        return self._map_swimlane(self._single_or_error(rows, "Failed to create swimlane."))

    def update_swimlane(
        self, owner_id: str, swimlane_id: str, payload: SwimlaneUpdateRequest
    ) -> SwimlaneResponse:
        self._get_swimlane_row(owner_id, swimlane_id)
        self.client.table("swimlanes").update(
            {
                "name": payload.name,
                "criteria_type": payload.criteriaType,
                "criteria_value": payload.criteriaValue,
            }
        ).eq("id", swimlane_id).eq("owner_id", owner_id).execute()

        return self._map_swimlane(self._get_swimlane_row(owner_id, swimlane_id))

    def delete_swimlane(self, owner_id: str, swimlane_id: str) -> None:
        self._get_swimlane_row(owner_id, swimlane_id)
        self.client.table("swimlanes").delete().eq("id", swimlane_id).eq("owner_id", owner_id).execute()

    # Internal helpers
    def _get_board_row(self, owner_id: str, board_id: str) -> dict:
        rows = self._rows(
            self.client.table("boards")
            .select("id,title,description,created_at")
            .eq("id", board_id)
            .eq("owner_id", owner_id)
            .limit(1)
            .execute()
        )
        return self._single_or_404(rows, "Board not found.")

    def _get_column_row(self, owner_id: str, column_id: str) -> dict:
        rows = self._rows(
            self.client.table("columns")
            .select("id,board_id,title,position,created_at")
            .eq("id", column_id)
            .eq("owner_id", owner_id)
            .limit(1)
            .execute()
        )
        return self._single_or_404(rows, "Column not found.")

    def _get_task_row(self, owner_id: str, task_id: str) -> dict:
        rows = self._rows(
            self.client.table("tasks")
            .select("id,board_id,column_id,title,description,priority,due_date,position,created_at")
            .eq("id", task_id)
            .eq("owner_id", owner_id)
            .limit(1)
            .execute()
        )
        return self._single_or_404(rows, "Task not found.")

    def _get_swimlane_row(self, owner_id: str, swimlane_id: str) -> dict:
        rows = self._rows(
            self.client.table("swimlanes")
            .select("id,board_id,name,criteria_type,criteria_value,created_at")
            .eq("id", swimlane_id)
            .eq("owner_id", owner_id)
            .limit(1)
            .execute()
        )
        return self._single_or_404(rows, "Swimlane not found.")

    def _assert_column_in_board(self, owner_id: str, board_id: str, column_id: str) -> None:
        rows = self._rows(
            self.client.table("columns")
            .select("id")
            .eq("id", column_id)
            .eq("board_id", board_id)
            .eq("owner_id", owner_id)
            .limit(1)
            .execute()
        )
        if not rows:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Column does not belong to board.")

    def _move_tasks_to_column(
        self, owner_id: str, board_id: str, from_column_id: str, to_column_id: str
    ) -> None:
        existing_target_rows = self._rows(
            self.client.table("tasks")
            .select("id")
            .eq("owner_id", owner_id)
            .eq("board_id", board_id)
            .eq("column_id", to_column_id)
            .order("position")
            .execute()
        )
        start_index = len(existing_target_rows)

        source_rows = self._rows(
            self.client.table("tasks")
            .select("id")
            .eq("owner_id", owner_id)
            .eq("board_id", board_id)
            .eq("column_id", from_column_id)
            .order("position")
            .execute()
        )

        for offset, row in enumerate(source_rows):
            self.client.table("tasks").update(
                {
                    "column_id": to_column_id,
                    "position": start_index + offset,
                }
            ).eq("id", row["id"]).eq("owner_id", owner_id).execute()

    def _normalize_task_positions(self, owner_id: str, board_id: str, column_id: str) -> None:
        rows = self._rows(
            self.client.table("tasks")
            .select("id")
            .eq("owner_id", owner_id)
            .eq("board_id", board_id)
            .eq("column_id", column_id)
            .order("position")
            .execute()
        )
        for index, row in enumerate(rows):
            self.client.table("tasks").update({"position": index}).eq("id", row["id"]).eq(
                "owner_id", owner_id
            ).execute()

    def _get_next_column_position(self, owner_id: str, board_id: str) -> int:
        rows = self._rows(
            self.client.table("columns")
            .select("position")
            .eq("owner_id", owner_id)
            .eq("board_id", board_id)
            .order("position", desc=True)
            .limit(1)
            .execute()
        )
        if not rows:
            return 0
        current_max = rows[0].get("position")
        return int(current_max) + 1 if isinstance(current_max, int) else 0

    def _get_next_task_position(self, owner_id: str, board_id: str, column_id: str) -> int:
        rows = self._rows(
            self.client.table("tasks")
            .select("position")
            .eq("owner_id", owner_id)
            .eq("board_id", board_id)
            .eq("column_id", column_id)
            .order("position", desc=True)
            .limit(1)
            .execute()
        )
        if not rows:
            return 0
        current_max = rows[0].get("position")
        return int(current_max) + 1 if isinstance(current_max, int) else 0

    @staticmethod
    def _normalize_due_date(due_date: str | None) -> str | None:
        if not due_date:
            return None

        try:
            date.fromisoformat(due_date)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="dueDate must be a valid ISO date (YYYY-MM-DD).",
            ) from exc

        return due_date

    @staticmethod
    def _rows(response: object) -> list[dict]:
        data = getattr(response, "data", None)
        if data is None:
            return []
        if isinstance(data, list):
            return [row for row in data if isinstance(row, dict)]
        if isinstance(data, dict):
            return [data]
        return []

    @staticmethod
    def _single_or_error(rows: list[dict], detail: str) -> dict:
        if not rows:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail)
        return rows[0]

    @staticmethod
    def _single_or_404(rows: list[dict], detail: str) -> dict:
        if not rows:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)
        return rows[0]

    @staticmethod
    def _map_board(row: dict) -> BoardResponse:
        return BoardResponse(
            id=str(row["id"]),
            title=str(row.get("title") or ""),
            description=str(row.get("description") or ""),
            createdAt=str(row.get("created_at") or ""),
        )

    @staticmethod
    def _map_column(row: dict) -> ColumnResponse:
        return ColumnResponse(
            id=str(row["id"]),
            boardId=str(row["board_id"]),
            title=str(row.get("title") or ""),
            order=int(row.get("position") or 0),
            createdAt=str(row.get("created_at") or ""),
        )

    @staticmethod
    def _map_task(row: dict) -> TaskResponse:
        return TaskResponse(
            id=str(row["id"]),
            boardId=str(row["board_id"]),
            columnId=str(row["column_id"]),
            title=str(row.get("title") or ""),
            description=str(row.get("description") or ""),
            priority=str(row.get("priority") or "medium"),
            dueDate=str(row["due_date"]) if row.get("due_date") else None,
            order=int(row.get("position") or 0),
            createdAt=str(row.get("created_at") or ""),
        )

    @staticmethod
    def _map_swimlane(row: dict) -> SwimlaneResponse:
        return SwimlaneResponse(
            id=str(row["id"]),
            boardId=str(row["board_id"]),
            name=str(row.get("name") or ""),
            criteriaType=str(row.get("criteria_type") or "priority"),
            criteriaValue=str(row.get("criteria_value") or ""),
            createdAt=str(row.get("created_at") or ""),
        )


def get_workspace_service() -> WorkspaceService:
    return WorkspaceService(create_supabase_admin_client())
