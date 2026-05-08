import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { TopnavComponent } from '../../shared/topnav/topnav';

export interface PaymentRecord {
  label: string;
  date: string;
}

export interface Review {
  avatar: string;
  name: string;
  timeAgo: string;
  rating: number;
  comment: string;
  helpful: number;
}

@Component({
  selector: 'app-public-user-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, SidebarComponent, TopnavComponent],
  templateUrl: './public-user-profile.html',
  styleUrl: './public-user-profile.scss'
})
export class PublicUserProfileComponent {

  // Pull real data from the logged-in Supabase user
  displayName = computed(() => {
    const user = this.auth.user();
    if (!user) return 'User';
    return user.user_metadata?.['full_name'] || user.email?.split('@')[0] || 'User';
  });

  email = computed(() => this.auth.user()?.email || '');

  initials = computed(() => {
    return this.displayName()
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  });

  memberSince = computed(() => {
    const user = this.auth.user();
    if (!user?.created_at) return '';
    return new Date(user.created_at).toLocaleDateString('en-US', {
      month: 'long', year: 'numeric'
    });
  });

  constructor(public auth: AuthService) {}

  paymentHistory: PaymentRecord[] = [
    { label: 'May Payout - $2,500', date: 'Completed on May 15, 2024' },
    { label: 'April Contribution', date: 'Completed on April 01, 2024' },
    { label: 'March Contribution', date: 'Completed on March 01, 2024' },
  ];

  reviews: Review[] = [
    {
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBN8EcbZ0_dXDy8DnarL5DlKcC_RWpsXdxLMRAfKCgbPrXi_U6mZmkt2XGUT5GBlqKSkiK04_oKmEvzJyGr3rDuTZ7Ivv-lsHtuHE6ImkkzxQ1H_x5hrzW2ELHIAY_of8EESRtXZuE8dqeiUhpZqIdw7mI8MQILUqlnJt0TvQ3JLHzSq_OkjmqA1J-k5tHVCKLBKAjjzNprLV7tw1cBbu3qzA_zXxcN7CkL_EVSEzL9OK1CwyHejAhU6cfy2L_B6jqO404KhX2LYUU',
      name: 'Michael Ross', timeAgo: '2 days ago', rating: 5,
      comment: 'An exemplary committee member. Always makes contributions on the first of the month without reminders. Very communicative during the payout phase!',
      helpful: 12
    },
    {
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuByBs8zK-QCurIPap8b7K3XFHbBpoUIUa1Ys992n9U3nKvrI74GWww-262gpwZ5HYpGFcfMBsqGTLnJ_wTCo2IVJWOowUJR4WX5wGr5G2-hX1l2wUmP1DmZ_MqET_L8ExCFiYS-jnJWm-nHRCraEXW004TNdNXdDz6VDyZ_3-G7Vc5ZCjtqVAp5HbA0Wrwr69NA5n4dtaMaVnID3TI23WBs45V9X-E-zlwkpgeC58-FReVRVsegcDgYh4d2j2h06I9n6ABvdW5kSpY',
      name: 'Elena Rodriguez', timeAgo: '3 weeks ago', rating: 4,
      comment: "Trustworthy and professional. A backbone of our local savings group.",
      helpful: 8
    },
  ];

  getStars(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i < rating ? 1 : 0);
  }
}
