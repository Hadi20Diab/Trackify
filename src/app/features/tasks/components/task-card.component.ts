import { ChangeDetectionStrategy, Component, EventEmitter, Output, input } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TaskItem } from '../../../models/task.model';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [DatePipe, TitleCasePipe, MatButtonModule, MatIconModule, MatMenuModule],
  templateUrl: './task-card.component.html',
  styleUrl: './task-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskCardComponent {
  readonly task = input.required<TaskItem>();

  @Output() readonly edit = new EventEmitter<string>();
  @Output() readonly delete = new EventEmitter<string>();

  onEdit(): void {
    this.edit.emit(this.task().id);
  }

  onDelete(): void {
    this.delete.emit(this.task().id);
  }

  get dueDateLabel(): Date | null {
    const dueDate = this.task().dueDate;
    if (!dueDate) {
      return null;
    }

    return new Date(`${dueDate}T00:00:00`);
  }
}
