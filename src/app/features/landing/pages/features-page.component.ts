import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PublicHeaderComponent } from '../components/public-header.component';

@Component({
  selector: 'app-features-page',
  standalone: true,
  imports: [PublicHeaderComponent],
  templateUrl: './features-page.component.html',
  styleUrl: './features-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturesPageComponent {}
