import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PublicHeaderComponent } from '../components/public-header.component';

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [PublicHeaderComponent],
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPageComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly mapUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
    'https://www.google.com/maps?q=33.5671521,35.3709632&z=17&output=embed',
  );
}
