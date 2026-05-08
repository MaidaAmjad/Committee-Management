import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { TopnavComponent } from '../../shared/topnav/topnav';

export interface CommitteeCard {
  id: number;
  image: string;
  category: string;
  name: string;
  trustLabel: string;
  trustIcon: string;
  trustIconColor: string;
  monthly: string;
  duration: string;
  membersJoined: number;
  membersTotal: number;
  slotLabel: string;
  slotBg: string;
  slotColor: string;
  memberAvatars: string[];
  extraCount: number | string;
}

export interface SmallCard {
  id: number;
  iconBg: string;
  icon: string;
  iconColor: string;
  category: string;
  name: string;
  description: string;
  monthly: string;
}

@Component({
  selector: 'app-browse-committees',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopnavComponent],
  templateUrl: './browse-committees.html',
  styleUrl: './browse-committees.scss'
})
export class BrowseCommitteesComponent {
  categories = ['Education', 'Healthcare', 'Real Estate', 'General Savings'];
  selectedCategories: Record<string, boolean> = { Education: true, 'Real Estate': true };
  selectedSlot = '3-5 slots';
  slots = ['1-2 slots', '3-5 slots', '5+ slots', 'Unlimited'];

  committeeCards: CommitteeCard[] = [
    {
      id: 1,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuANq4YcPUx4vQqmzfxpCsdoQvJ0ZPh7yGE9m2gaVGpxxWluH63x9TWcRdCYmWQymQWALCTuDXeb2CcuhcyBmOuoo-i3Gyzq9NxMVa6I4LQT5JF5bMaPjgyNPyF96fX7487D9HhJM3eJdY2cQ9g6cd1IHr_qvyaV23g2hMg4SI2bTHlAApdu5q4HC2ZdNsabSe19GEC0T6LJHhQLbfrBmX-8XKSbsoei5pvA77x6jPKjAeG3Zm4a_WZCte-0lMfUUZqJt15BIqcUuus',
      category: 'Real Estate', name: 'Lagos Property Circle',
      trustLabel: 'Top Tier Trust', trustIcon: 'verified', trustIconColor: '#004ac6',
      monthly: '$500/mo', duration: '12 Months',
      membersJoined: 8, membersTotal: 10,
      slotLabel: '2 SLOTS LEFT', slotBg: '#ffdbcd', slotColor: '#7d2d00',
      memberAvatars: [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCMznGX1fK7UFnRpwYNxTe41Ttv8q1AlmiRNfgjdmqgwpvcFNg1qnsFKz6FlH4lhQ1D8yyOQ-1Lc4BISwBZDWhKFeWZafJzhnFv1eBgnm5wkeqUlTpzd2oJVAj14KqeDMPvr_UtbGvEmzrWU9QKK_99I_tjQCzlQeOdYpIh6pXZM8IOwY4nqTeNZ2J67zTK63LUhhDl1QTRt8p7GL8SMLNGLfMxm8DF8DmbPt2JR8GaE3ZWd93Wfcw6qRHc0IMpPf72nQQIIxxl8Fg',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuD2_rD2-29meiiXrJ8_MJPwkJIbOYrcW58JLjGj25iV4X9g0FcQ1BjK-HnrGcaqP6vIwlpHvZjunsuyRBku9ZjrSzw6dCRv0MdvuFCjyCfGkN5HWRNuwgqd1dHUqjwa_AJ3X-dCh1WxJne9OpZ-2zA6oq5nPtKg05SHBu_tIajAwTUg95x0ALhx6dYUh5qCEDfXoPya1brl8nWUqnePYI-9qbBgQBgqor66btguCY7OphqE-oG4dTI8cjTu1xkz_L8WYK5WhYdNKQk',
      ],
      extraCount: '+6'
    },
    {
      id: 2,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDACO_-DJ4MRTeERTlyQvpVmY7g0x4Zjt9cSbaMDy-pfBMQ-BqABjtk2LfRoUkwC2DqegsKvVsUxDdISrVD1G2pjKbKAg0QpLCDBynd0y0-yWWHPzW9c3IrcBCEuQGbwNpm7jZOe72DutU2-t2j-T5rdAbrzYiM3ABZjGD_7LqQtfgaEq6uUHZPAEgERRPE-s_j05lPcLvhPVh6rDClN7OESUTxb5NPSK6xD3mPJVLHyvAdyWcniuwuw6XnlZTKWcYcOVblH6J12oM',
      category: 'Education', name: 'MBA Funding Circle',
      trustLabel: 'Starts in 3 days', trustIcon: 'lock_clock', trustIconColor: '#505f76',
      monthly: '$1,200/mo', duration: '24 Months',
      membersJoined: 18, membersTotal: 20,
      slotLabel: 'LIMITED SLOTS', slotBg: '#ffdbcd', slotColor: '#7d2d00',
      memberAvatars: [], extraCount: '+16'
    },
    {
      id: 3,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBF_GKF_9dqMfDkHtOhhl_NQ-0Mip6w6DcpOfzih0_esMYY9Q6ildT4feSEzN2pYMEq60pQlpb5YNZ6JG1x46AIZqgOvYPSfmgnHGjM9j-E_8cI91Eo6ZLMIvcaQTuILk775VslFNB-lcV4rivzp5t7bN1g1Kh9XdtJTq5aS-Dag1v_eUwO1oz-ZJEJ8cM8-wlakdTvKyVDP0RoJxCUoaNBGRmoMpjIlbtE8v7Q_rmEflWhgxtExmhPzHxw_-S6WQzAPKHg62LvqLU',
      category: 'General Savings', name: 'Holiday Trip Fund',
      trustLabel: 'Open to all members', trustIcon: 'public', trustIconColor: '#505f76',
      monthly: '$100/mo', duration: '6 Months',
      membersJoined: 3, membersTotal: 15,
      slotLabel: '12 SLOTS OPEN', slotBg: '#d0e1fb', slotColor: '#54647a',
      memberAvatars: [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuD2Ajjli4TwcnnAkpOk4lEo6x4PW1SZyEnrEP1naVdwywwGtVVUNt0vYe_tssf9FWpsXdgr6rjQphvqz1M58-84mu0LnXjP9SRA4JfCOnVuDN2wIja34KSnJKSLIZovhlDThqr8WMY2qv_Kida4mkMopTtY10qmMnSVsR_xcYzEjYvCwygAZvYc_qxDyQbynNF62Eq9hnlf6QGA7EYB0aaVqYbHqcQNlXGIh-1CI0Ueqh_dWH_0AJCKqIsIEhd5FZIKbP8m5IC3qtA',
      ],
      extraCount: '+2'
    }
  ];

  smallCards: SmallCard[] = [
    {
      id: 4, iconBg: '#d3e4fe', icon: 'medical_services', iconColor: '#38485d',
      category: 'HEALTHCARE', name: 'Medical Emergency Fund',
      description: 'High-priority circle for shared medical emergency liquidity.',
      monthly: '$250'
    },
    {
      id: 5, iconBg: '#ffdbcd', icon: 'home_work', iconColor: '#7d2d00',
      category: 'REAL ESTATE', name: 'Office Space Equity',
      description: 'Crowdfunding commercial office renovations in tech hubs.',
      monthly: '$800'
    }
  ];

  getMemberProgress(joined: number, total: number): number {
    return (joined / total) * 100;
  }

  resetFilters(): void {
    this.selectedCategories = {};
    this.selectedSlot = '';
  }
}
