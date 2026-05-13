import { Component, Input, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentReliabilityService } from '../../core/payment-reliability.service';

@Component({
  selector: 'app-reliability-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (stats) {
      <span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
        [style.color]="stats.labelColor"
        [style.background-color]="stats.labelBg">
        {{ stats.emoji }} {{ stats.label }}
      </span>
    }
  `
})
export class ReliabilityBadgeComponent implements OnInit {
  @Input() score: number = 100;
  stats: { label: string; labelColor: string; labelBg: string; emoji: string } | null = null;

  constructor(private reliabilityService: PaymentReliabilityService) {}

  ngOnInit(): void {
    this.stats = this.reliabilityService.getReliabilityLabel(this.score);
  }
}
