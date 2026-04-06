import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface BoardFormDialogData {
  title?: string;
  description?: string;
}

export interface BoardFormDialogResult {
  title: string;
  description: string;
}

@Component({
  selector: 'app-board-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './board-form-dialog.component.html',
  styleUrl: './board-form-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<BoardFormDialogComponent, BoardFormDialogResult>);
  private readonly data = inject<BoardFormDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  readonly form = this.fb.nonNullable.group({
    title: [this.data.title ?? '', [Validators.required, Validators.maxLength(80)]],
    description: [this.data.description ?? '', [Validators.maxLength(400)]],
  });

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close({
      title: this.form.controls.title.value,
      description: this.form.controls.description.value,
    });
  }
}
