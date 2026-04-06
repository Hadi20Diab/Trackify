import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  constructor(private readonly snackBar: MatSnackBar) {}

  success(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 2600,
      panelClass: ['toast-success'],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }

  info(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 2600,
      panelClass: ['toast-info'],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }

  warn(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3200,
      panelClass: ['toast-warn'],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }
}
