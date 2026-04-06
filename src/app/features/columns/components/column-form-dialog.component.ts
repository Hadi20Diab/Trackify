import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface ColumnFormDialogData {
  title?: string;
  mode?: 'create' | 'rename';
}

export interface ColumnFormDialogResult {
  title: string;
}

@Component({
  selector: 'app-column-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './column-form-dialog.component.html',
  styleUrl: './column-form-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColumnFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ColumnFormDialogComponent, ColumnFormDialogResult>);
  private readonly data = inject<ColumnFormDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  readonly mode = this.data.mode ?? 'create';

  readonly form = this.fb.nonNullable.group({
    title: [this.data.title ?? '', [Validators.required, Validators.maxLength(50)]],
  });

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close({
      title: this.form.controls.title.value,
    });
  }
}
