import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import { ContactService } from '../../../services/contact.service';
import { NotificationService } from '../../../services/notification.service';
import { PublicHeaderComponent } from '../components/public-header.component';

@Component({
  selector: 'app-contact-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    PublicHeaderComponent,
  ],
  templateUrl: './contact-page.component.html',
  styleUrl: './contact-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly contactService = inject(ContactService);
  private readonly notification = inject(NotificationService);

  readonly isSubmitting = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
    subject: ['', [Validators.required, Validators.maxLength(120)]],
    message: ['', [Validators.required, Validators.maxLength(2000)]],
  });

  send(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    this.contactService
      .sendMessage(this.form.getRawValue())
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Message sent successfully.');
          this.form.reset({
            name: '',
            email: '',
            subject: '',
            message: '',
          });
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 0) {
            this.notification.warn('Contact API is offline. Run `npm run start:api` and try again.');
            return;
          }

          if (error instanceof HttpErrorResponse && error.status === 404) {
            this.notification.warn('Contact endpoint was not found. Ensure API server is running.');
            return;
          }

          if (error instanceof HttpErrorResponse && error.status === 500) {
            this.notification.warn('SMTP send failed. Check SMTP settings in `.env`.');
            return;
          }

          this.notification.warn('Unable to send your message right now.');
        },
      });
  }
}
