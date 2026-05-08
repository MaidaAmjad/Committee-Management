import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  imports: [CommonModule],
  templateUrl: './public-user-profile.html',
  styleUrl: './public-user-profile.scss'
})
export class PublicUserProfileComponent {
  user = {
    name: 'Sarah Jenkins',
    badge: 'Premium Member',
    bio: 'Financial advisor and community leader with 10+ years of experience managing collective savings and transparent committee governance.',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuClLrKX5bZ8Bk8ocweKOwl9_dlPezaw97ZPqcQSQik2KM-HbRiN5-f7X5X1ZwsG6FnJwJoBwu7VL_lll4Vs8tzBQJkM3F6SzW85X1V8Wly2ywvHyVZG1EdHNc8qNdapVfQtA8scAVqwGBBVtWQTOklkx7j2F6xBtUxuvXQ_WbGjWAUFsCU2wCMTZ3T-NU45PUouydLxx3pcrPzvXDwcml-lQCQAklOXARqoh8JYrQFc-ne8nvk1t7TPRzaqFUaTajzcveeHryZ46dk',
    trustScore: 98,
    rating: '4.9/5',
    completedCommittees: 25,
    successRate: '100%',
  };

  paymentHistory: PaymentRecord[] = [
    { label: 'May Payout - $2,500', date: 'Completed on May 15, 2024' },
    { label: 'April Contribution', date: 'Completed on April 01, 2024' },
    { label: 'March Contribution', date: 'Completed on March 01, 2024' },
  ];

  activeMembers = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAhBzfolsgi3nA6NtUQcpiwmP7bXHOIwF1yZ82wI1vGCE6PC_MfXrtZb8gUVihc5QCWStIAaFdeBDVj0dmClHa4gy6SFRbxVEVK2voolu-zq1aPZzPm8dLTMn6RzyUKhi-6ytLkODoSfHbfU34VFuLIUpAta02krTn2tJrotHdi-3XO2uSNRjNPu96fTIMHfcp5fYkqkhSgDuDM1KnJDy34CerVGLOGGahNleyVBQFkkhjlRVt50JLD8xaCqUcfSeRZOG6tvEmhFoI',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDUMZh11VCF53-tGIw2C19CS25W1RjYwArZlYy4nCpjFCJaIjeMmthHxeigObCVO8bLNP29L_bTQ3JIlHvtMuKYlR9GJH6skVjbSP7VjYHkYdEolj7yKkcwMzdmctgkxztMffUN8smlJCZ9aWsOEOhvwG1uQZuLS9-Ud-ZotSFF_MnDMZ3PpgCL5iQvwQ01E2b43lu_g2clftsbXGXmk1wSTKDF_akiSgasbzApiqJ1g-XjTtRDLsETlG5yjVZgz7i6rqvbSzN_9DI',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuB5EVomBT1DgG3GhQ8e5_weSGhaw3ouieeW7uLwzIr0UbCNiZWxX8eOMdMXhNhl36F-NXjkIEVt2fF9xKc5LoXS2QJUJoSx41TQ6PO1_SqKN-4YcMzbkecC1ygEB09wfZqft5uWpVpSoJ4_Vk8wRTXbzWRYdA_90Ey9GerZZRHGjN7s6alU8Apb_uoW7NiSW3rz4KTuMTcqcYVMabD9q-wcn7vxWuOGEW9FEQRTi3KGiEh600l7XXp3r9a8DKZBwXgi-R6U-oMWRmw',
  ];

  reviews: Review[] = [
    {
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBN8EcbZ0_dXDy8DnarL5DlKcC_RWpsXdxLMRAfKCgbPrXi_U6mZmkt2XGUT5GBlqKSkiK04_oKmEvzJyGr3rDuTZ7Ivv-lsHtuHE6ImkkzxQ1H_x5hrzW2ELHIAY_of8EESRtXZuE8dqeiUhpZqIdw7mI8MQILUqlnJt0TvQ3JLHzSq_OkjmqA1J-k5tHVCKLBKAjjzNprLV7tw1cBbu3qzA_zXxcN7CkL_EVSEzL9OK1CwyHejAhU6cfy2L_B6jqO404KhX2LYUU',
      name: 'Michael Ross', timeAgo: '2 days ago', rating: 5,
      comment: 'Sarah is an exemplary committee member. She always makes her contributions on the first of the month without reminders. Very communicative during the payout phase!',
      helpful: 12
    },
    {
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuByBs8zK-QCurIPap8b7K3XFHbBpoUIUa1Ys992n9U3nKvrI74GWww-262gpwZ5HYpGFcfMBsqGTLnJ_wTCo2IVJWOowUJR4WX5wGr5G2-hX1l2wUmP1DmZ_MqET_L8ExCFiYS-jnJWm-nHRCraEXW004TNdNXdDz6VDyZ_3-G7Vc5ZCjtqVAp5HbA0Wrwr69NA5n4dtaMaVnID3TI23WBs45V9X-E-zlwkpgeC58-FReVRVsegcDgYh4d2j2h06I9n6ABvdW5kSpY',
      name: 'Elena Rodriguez', timeAgo: '3 weeks ago', rating: 4,
      comment: "We've worked together on three committees now. Trustworthy and professional. A backbone of our local savings group.",
      helpful: 8
    },
    {
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBIotrChzVqJcl7ihKFhUIW741Fv31wronFHjsS_2vO4JND9WWT9uzLhnwVEWCVl70YCewWPB96c4mV-DVCnTmlmo9LlXg1buFrR6ekI7S_lD-tcrehcMzTs14Mwz34_qubQ1B3NSfy-D35dpSzvn1lHSkHp1BAAY16IwBFat-Kw_lGKbQyVJkUwPPioCBUAGjzVX_4zkbMmeTe7RtpwapfaU_X3snxWpBlgN_rsuMECcfnAzyYoLAHd92aarkhMiAcWHztI2mk_48',
      name: 'David Chen', timeAgo: '1 month ago', rating: 5,
      comment: 'Extremely organized. She actually helped set up our meeting schedule and ensured everyone understood the transparent ledgers.',
      helpful: 15
    }
  ];

  getStars(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i < rating ? 1 : 0);
  }
}
