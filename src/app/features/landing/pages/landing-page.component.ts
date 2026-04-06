import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { PublicHeaderComponent } from '../components/public-header.component';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, RouterLink, PublicHeaderComponent],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent {}
