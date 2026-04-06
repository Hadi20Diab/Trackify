import { TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { BoardColumn } from '../../../models/column.model';
import { TaskPriority, UpdateTaskPayload } from '../../../models/task.model';

export interface TaskFormDialogData {
  mode: 'create' | 'edit';
  columns: BoardColumn[];
  initialValue?: UpdateTaskPayload;
}

export interface TaskFormDialogResult extends UpdateTaskPayload {}

@Component({
  selector: 'app-task-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    TitleCasePipe,
  ],
  templateUrl: './task-form-dialog.component.html',
  styleUrl: './task-form-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<TaskFormDialogComponent, TaskFormDialogResult>);
  readonly data = inject<TaskFormDialogData>(MAT_DIALOG_DATA);

  readonly priorities: TaskPriority[] = ['low', 'medium', 'high'];

  readonly form = this.fb.nonNullable.group({
    title: [this.data.initialValue?.title ?? '', [Validators.required, Validators.maxLength(120)]],
    description: [this.data.initialValue?.description ?? '', [Validators.maxLength(1000)]],
    columnId: [
      this.data.initialValue?.columnId ?? this.data.columns[0]?.id ?? '',
      [Validators.required],
    ],
    priority: [this.data.initialValue?.priority ?? ('medium' as TaskPriority), [Validators.required]],
    dueDate: [this.toDateOrNull(this.data.initialValue?.dueDate ?? null)],
  });

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dueDate = this.form.controls.dueDate.value;

    this.dialogRef.close({
      title: this.form.controls.title.value,
      description: this.form.controls.description.value,
      columnId: this.form.controls.columnId.value,
      priority: this.form.controls.priority.value,
      dueDate: dueDate ? this.toDateOnlyString(dueDate) : null,
    });
  }

  private toDateOrNull(value: string | null): Date | null {
    if (!value) {
      return null;
    }

    return new Date(`${value}T00:00:00`);
  }

  private toDateOnlyString(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
