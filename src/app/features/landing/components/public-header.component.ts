import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-public-header',
  standalone: true,
  imports: [MatButtonModule, RouterLink, RouterLinkActive],
  templateUrl: './public-header.component.html',
  styleUrl: './public-header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicHeaderComponent {}
