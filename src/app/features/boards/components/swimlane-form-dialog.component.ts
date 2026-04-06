import { TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { BoardColumn } from '../../../models/column.model';
import {
  DueStatusCriteriaValue,
  SwimlaneCriteriaType,
  SwimlaneFormPayload,
} from '../../../models/swimlane.model';

interface SwimlaneFormDialogValue extends SwimlaneFormPayload {}

export interface SwimlaneFormDialogData {
  mode: 'create' | 'edit';
  columns: BoardColumn[];
  initialValue?: SwimlaneFormDialogValue;
}

export interface SwimlaneFormDialogResult extends SwimlaneFormDialogValue {}

interface CriteriaOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-swimlane-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TitleCasePipe,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './swimlane-form-dialog.component.html',
  styleUrl: './swimlane-form-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SwimlaneFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(
    MatDialogRef<SwimlaneFormDialogComponent, SwimlaneFormDialogResult>,
  );
  readonly data = inject<SwimlaneFormDialogData>(MAT_DIALOG_DATA);

  readonly criteriaTypes: SwimlaneCriteriaType[] = ['priority', 'column', 'dueStatus'];

  readonly dueStatusOptions: Array<{ label: string; value: DueStatusCriteriaValue }> = [
    { label: 'Overdue', value: 'overdue' },
    { label: 'Today', value: 'today' },
    { label: 'Next 7 Days', value: 'next7days' },
    { label: 'Later', value: 'later' },
    { label: 'No Due Date', value: 'noDueDate' },
  ];

  readonly form = this.fb.nonNullable.group({
    name: [
      this.data.initialValue?.name ?? '',
      [Validators.required, Validators.maxLength(60)],
    ],
    criteriaType: [
      this.data.initialValue?.criteriaType ?? ('priority' as SwimlaneCriteriaType),
      [Validators.required],
    ],
    criteriaValue: [
      this.data.initialValue?.criteriaValue ?? 'high',
      [Validators.required],
    ],
  });

  readonly criteriaOptions = computed<CriteriaOption[]>(() => {
    const criteriaType = this.form.controls.criteriaType.value;

    if (criteriaType === 'priority') {
      return [
        { label: 'High', value: 'high' },
        { label: 'Medium', value: 'medium' },
        { label: 'Low', value: 'low' },
      ];
    }

    if (criteriaType === 'column') {
      return this.data.columns.map((column) => ({
        label: column.title,
        value: column.id,
      }));
    }

    return this.dueStatusOptions;
  });

  constructor() {
    this.form.controls.criteriaType.valueChanges.subscribe((criteriaType) => {
      const currentValue = this.form.controls.criteriaValue.value;
      const options = this.getCriteriaOptions(criteriaType);
      const hasCurrentValue = options.some((option) => option.value === currentValue);

      if (hasCurrentValue) {
        return;
      }

      this.form.controls.criteriaValue.setValue(options[0]?.value ?? '');
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close({
      name: this.form.controls.name.value,
      criteriaType: this.form.controls.criteriaType.value,
      criteriaValue: this.form.controls.criteriaValue.value,
    });
  }

  private getCriteriaOptions(criteriaType: SwimlaneCriteriaType): CriteriaOption[] {
    if (criteriaType === 'priority') {
      return [
        { label: 'High', value: 'high' },
        { label: 'Medium', value: 'medium' },
        { label: 'Low', value: 'low' },
      ];
    }

    if (criteriaType === 'column') {
      return this.data.columns.map((column) => ({
        label: column.title,
        value: column.id,
      }));
    }

    return this.dueStatusOptions;
  }
}
