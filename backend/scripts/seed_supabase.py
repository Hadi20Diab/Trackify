from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path
from typing import Literal
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen
from uuid import uuid4

from dotenv import load_dotenv
import os

TaskPriority = Literal["low", "medium", "high"]


@dataclass(frozen=True)
class SeedTask:
    title: str
    description: str
    column: str
    priority: TaskPriority = "medium"
    due_in_days: int | None = None


@dataclass(frozen=True)
class SeedSwimlane:
    name: str
    criteria_type: Literal["priority", "column", "dueStatus"]
    criteria_value: str


@dataclass(frozen=True)
class SeedBoard:
    title: str
    description: str
    columns: tuple[str, ...]
    tasks: tuple[SeedTask, ...]
    swimlanes: tuple[SeedSwimlane, ...] = ()


@dataclass(frozen=True)
class SeedUser:
    key: str
    full_name: str
    email: str
    password: str
    boards: tuple[SeedBoard, ...]


class SeederError(RuntimeError):
    pass


DEMO_PASSWORD = "TrackifyDemo!2026"

SEED_USERS: tuple[SeedUser, ...] = (
    SeedUser(
        key="product_manager",
        full_name="Layla Haddad",
        email="layla.demo@trackify.app",
        password=DEMO_PASSWORD,
        boards=(
            SeedBoard(
                title="Trackify Platform Roadmap",
                description="Seed data: strategic platform work for Q2 delivery.",
                columns=("To Do", "In Progress", "In Review", "Done"),
                tasks=(
                    SeedTask(
                        title="Define board analytics KPIs",
                        description="Align product and engineering on measurable dashboard outcomes.",
                        column="To Do",
                        priority="medium",
                        due_in_days=5,
                    ),
                    SeedTask(
                        title="Implement Supabase RLS policy matrix",
                        description="Finalize owner isolation for boards, columns, tasks, and swimlanes.",
                        column="In Progress",
                        priority="high",
                        due_in_days=3,
                    ),
                    SeedTask(
                        title="Review auth UX copy",
                        description="Polish messaging for login, registration, and recovery states.",
                        column="In Review",
                        priority="low",
                        due_in_days=2,
                    ),
                    SeedTask(
                        title="Ship draggable columns",
                        description="Completed DnD support and validated ordering persistence.",
                        column="Done",
                        priority="medium",
                        due_in_days=-1,
                    ),
                ),
                swimlanes=(
                    SeedSwimlane(name="Critical", criteria_type="priority", criteria_value="high"),
                    SeedSwimlane(name="Review Lane", criteria_type="column", criteria_value="In Review"),
                ),
            ),
            SeedBoard(
                title="Customer Feedback Loop",
                description="Seed data: closing customer feedback with product actions.",
                columns=("To Do", "In Progress", "Done"),
                tasks=(
                    SeedTask(
                        title="Tag incoming feedback by feature area",
                        description="Normalize tags for roadmap and support follow-up.",
                        column="To Do",
                        priority="low",
                        due_in_days=6,
                    ),
                    SeedTask(
                        title="Weekly stakeholder digest",
                        description="Send summary with open issues and next release commitments.",
                        column="In Progress",
                        priority="medium",
                        due_in_days=1,
                    ),
                ),
            ),
        ),
    ),
    SeedUser(
        key="engineering_lead",
        full_name="Rami Saad",
        email="rami.demo@trackify.app",
        password=DEMO_PASSWORD,
        boards=(
            SeedBoard(
                title="Engineering Sprint Alpha",
                description="Seed data: implementation sprint for backend and auth integration.",
                columns=("Backlog", "In Progress", "QA", "Done"),
                tasks=(
                    SeedTask(
                        title="Harden FastAPI error handling",
                        description="Standardize API errors for client parsing and telemetry.",
                        column="In Progress",
                        priority="high",
                        due_in_days=2,
                    ),
                    SeedTask(
                        title="Optimize board snapshot query path",
                        description="Reduce requests by returning board, columns, tasks, and swimlanes in one response.",
                        column="Backlog",
                        priority="medium",
                        due_in_days=7,
                    ),
                    SeedTask(
                        title="Validate drag-drop move edge cases",
                        description="Ensure source/target ordering remains stable across all move scenarios.",
                        column="QA",
                        priority="medium",
                        due_in_days=1,
                    ),
                    SeedTask(
                        title="Wire auth guards in Angular",
                        description="Completed guarded routes and guest-only auth pages.",
                        column="Done",
                        priority="low",
                        due_in_days=-2,
                    ),
                ),
                swimlanes=(
                    SeedSwimlane(name="High Priority", criteria_type="priority", criteria_value="high"),
                ),
            ),
        ),
    ),
    SeedUser(
        key="operations_manager",
        full_name="Mira Nassar",
        email="mira.demo@trackify.app",
        password=DEMO_PASSWORD,
        boards=(
            SeedBoard(
                title="Ops Command Center",
                description="Seed data: operational readiness and release coordination.",
                columns=("Queue", "Active", "Blocked", "Done"),
                tasks=(
                    SeedTask(
                        title="Prepare launch day checklist",
                        description="Finalize owner matrix and rollback plan.",
                        column="Active",
                        priority="high",
                        due_in_days=1,
                    ),
                    SeedTask(
                        title="Vendor SLA audit",
                        description="Review support response windows and escalation paths.",
                        column="Queue",
                        priority="medium",
                        due_in_days=10,
                    ),
                    SeedTask(
                        title="Collect deployment evidence",
                        description="Archive release notes, monitoring links, and incident contacts.",
                        column="Blocked",
                        priority="low",
                        due_in_days=4,
                    ),
                ),
                swimlanes=(
                    SeedSwimlane(name="Needs Attention", criteria_type="column", criteria_value="Blocked"),
                ),
            ),
        ),
    ),
)


class SupabaseAdminClient:
    def __init__(self, supabase_url: str, service_role_key: str) -> None:
        self.supabase_url = supabase_url.rstrip("/")
        self.service_role_key = service_role_key

    def _request(
        self,
        method: str,
        path: str,
        *,
        payload: dict | list | None = None,
        prefer: str | None = None,
    ) -> dict | list | None:
        url = f"{self.supabase_url}{path}"
        body: bytes | None = None

        if payload is not None:
            body = json.dumps(payload).encode("utf-8")

        request = Request(url=url, method=method, data=body)
        request.add_header("apikey", self.service_role_key)
        request.add_header("Authorization", f"Bearer {self.service_role_key}")
        request.add_header("Content-Type", "application/json")
        if prefer:
            request.add_header("Prefer", prefer)

        try:
            with urlopen(request, timeout=30) as response:
                raw = response.read().decode("utf-8").strip()
                if not raw:
                    return None
                return json.loads(raw)
        except HTTPError as exc:
            raw_error = exc.read().decode("utf-8").strip()
            detail = raw_error
            try:
                parsed = json.loads(raw_error)
                detail = json.dumps(parsed)
            except json.JSONDecodeError:
                pass
            raise SeederError(f"HTTP {exc.code} {method} {path}: {detail}") from exc
        except URLError as exc:
            raise SeederError(f"Network error while calling {method} {path}: {exc}") from exc

    def create_auth_user(self, email: str, password: str, full_name: str) -> str:
        response = self._request(
            "POST",
            "/auth/v1/admin/users",
            payload={
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"full_name": full_name},
            },
        )

        if not isinstance(response, dict) or not isinstance(response.get("id"), str):
            raise SeederError(f"Unexpected create user response for {email}: {response}")

        return response["id"]

    def list_auth_users(self, page: int = 1, per_page: int = 200) -> list[dict]:
        response = self._request("GET", f"/auth/v1/admin/users?page={page}&per_page={per_page}")
        if not isinstance(response, dict):
            return []
        users = response.get("users")
        if isinstance(users, list):
            return [item for item in users if isinstance(item, dict)]
        return []

    def find_auth_user_id_by_email(self, email: str) -> str | None:
        normalized = email.strip().lower()
        page = 1

        while True:
            users = self.list_auth_users(page=page)
            if not users:
                return None

            for user in users:
                user_email = user.get("email")
                user_id = user.get("id")
                if isinstance(user_email, str) and isinstance(user_id, str):
                    if user_email.strip().lower() == normalized:
                        return user_id

            if len(users) < 200:
                return None

            page += 1

    def insert_rows(self, table: str, rows: list[dict]) -> None:
        if not rows:
            return

        self._request(
            "POST",
            f"/rest/v1/{table}",
            payload=rows,
            prefer="return=minimal",
        )

    def delete_by_owner(self, table: str, owner_id: str) -> None:
        encoded_owner = quote(owner_id, safe="")
        self._request(
            "DELETE",
            f"/rest/v1/{table}?owner_id=eq.{encoded_owner}",
            prefer="return=minimal",
        )


def due_date(days_offset: int | None) -> str | None:
    if days_offset is None:
        return None
    return (date.today() + timedelta(days=days_offset)).isoformat()


def create_or_get_user(client: SupabaseAdminClient, seed_user: SeedUser) -> str:
    try:
        return client.create_auth_user(seed_user.email, seed_user.password, seed_user.full_name)
    except SeederError as exc:
        message = str(exc)
        duplicate_markers = (
            "email_exists",
            "already been registered",
            "User already registered",
        )
        if not any(marker in message for marker in duplicate_markers):
            raise

        user_id = client.find_auth_user_id_by_email(seed_user.email)
        if user_id is None:
            raise SeederError(
                f"User {seed_user.email} appears to exist, but could not be resolved by admin list API."
            ) from exc

        return user_id


def reset_user_workspace(client: SupabaseAdminClient, owner_id: str) -> None:
    # Ordered cleanup to avoid relational issues in custom schemas.
    for table in ("tasks", "swimlanes", "columns", "boards"):
        client.delete_by_owner(table, owner_id)


def seed_user_workspace(client: SupabaseAdminClient, owner_id: str, boards: tuple[SeedBoard, ...]) -> None:
    for board in boards:
        board_id = str(uuid4())

        client.insert_rows(
            "boards",
            [
                {
                    "id": board_id,
                    "owner_id": owner_id,
                    "title": board.title,
                    "description": board.description,
                }
            ],
        )

        column_id_by_title: dict[str, str] = {}
        column_rows: list[dict] = []
        for index, column_title in enumerate(board.columns):
            column_id = str(uuid4())
            column_id_by_title[column_title] = column_id
            column_rows.append(
                {
                    "id": column_id,
                    "owner_id": owner_id,
                    "board_id": board_id,
                    "title": column_title,
                    "position": index,
                }
            )

        client.insert_rows("columns", column_rows)

        task_position_by_column: dict[str, int] = {}
        task_rows: list[dict] = []
        for task in board.tasks:
            column_id = column_id_by_title.get(task.column)
            if column_id is None:
                raise SeederError(
                    f"Task '{task.title}' references unknown column '{task.column}' in board '{board.title}'."
                )

            position = task_position_by_column.get(task.column, 0)
            task_position_by_column[task.column] = position + 1

            task_rows.append(
                {
                    "id": str(uuid4()),
                    "owner_id": owner_id,
                    "board_id": board_id,
                    "column_id": column_id,
                    "title": task.title,
                    "description": task.description,
                    "priority": task.priority,
                    "due_date": due_date(task.due_in_days),
                    "position": position,
                }
            )

        client.insert_rows("tasks", task_rows)

        swimlane_rows: list[dict] = []
        for swimlane in board.swimlanes:
            swimlane_rows.append(
                {
                    "id": str(uuid4()),
                    "owner_id": owner_id,
                    "board_id": board_id,
                    "name": swimlane.name,
                    "criteria_type": swimlane.criteria_type,
                    "criteria_value": swimlane.criteria_value,
                }
            )

        client.insert_rows("swimlanes", swimlane_rows)


def select_seed_users(requested_keys: str | None) -> tuple[SeedUser, ...]:
    if not requested_keys:
        return SEED_USERS

    key_set = {key.strip() for key in requested_keys.split(",") if key.strip()}
    selected = tuple(user for user in SEED_USERS if user.key in key_set)

    if not selected:
        available = ", ".join(user.key for user in SEED_USERS)
        raise SeederError(f"No seed users matched. Available keys: {available}")

    return selected


def print_summary(seed_users: tuple[SeedUser, ...], user_ids: dict[str, str]) -> None:
    print("\nSeed completed successfully.\n")
    print("Users:")
    for user in seed_users:
        print(f"- {user.full_name} ({user.email}) -> {user_ids[user.email]}")

    print("\nDemo credentials:")
    for user in seed_users:
        print(f"- {user.email} / {user.password}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed Supabase with Trackify demo users and workspace data.")
    parser.add_argument(
        "--users",
        type=str,
        default=None,
        help="Comma-separated seed user keys (example: product_manager,engineering_lead).",
    )
    parser.add_argument(
        "--skip-reset",
        action="store_true",
        help="Skip deleting existing workspace rows for selected seed users before inserting.",
    )
    return parser.parse_args()


def main() -> int:
    script_dir = Path(__file__).resolve().parent
    env_path = script_dir.parent / ".env"
    load_dotenv(env_path)

    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

    if not supabase_url or not service_role_key:
        print(
            "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env",
            file=sys.stderr,
        )
        return 1

    try:
        args = parse_args()
        selected_users = select_seed_users(args.users)
        client = SupabaseAdminClient(supabase_url=supabase_url, service_role_key=service_role_key)

        user_ids: dict[str, str] = {}
        for seed_user in selected_users:
            user_id = create_or_get_user(client, seed_user)
            user_ids[seed_user.email] = user_id

        if not args.skip_reset:
            for seed_user in selected_users:
                reset_user_workspace(client, user_ids[seed_user.email])

        for seed_user in selected_users:
            seed_user_workspace(client, user_ids[seed_user.email], seed_user.boards)

        print_summary(selected_users, user_ids)
        return 0
    except SeederError as exc:
        print(f"Seeding failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
