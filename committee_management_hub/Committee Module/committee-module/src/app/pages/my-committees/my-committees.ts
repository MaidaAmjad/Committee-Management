import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { TopnavComponent } from '../../shared/topnav/topnav';

export interface LeadCommittee {
  name: string;
  role: string;
  status: string;
  statusBg: string;
  statusColor: string;
  statusBorder: string;
  contribution: string;
  nextPayment: string;
  members: { src: string; alt: string }[];
  extraCount: string;
  trustWidth: string;
}

export interface MemberCommittee {
  name: string;
  status: string;
  statusBg: string;
  statusColor: string;
  statusBorder: string;
  contribution: string;
  paymentDate: string;
  participants: string;
}

@Component({
  selector: 'app-my-committees',
  standalone: true,
  imports: [CommonModule, SidebarComponent, TopnavComponent],
  templateUrl: './my-committees.html',
  styleUrl: './my-committees.scss'
})
export class MyCommitteesComponent {
  activeTab: 'Active' | 'Past' = 'Active';

  leadCommittees: LeadCommittee[] = [
    {
      name: 'Tech Founders Circle', role: 'Admin',
      status: 'Active', statusBg: '#f0fdf4', statusColor: '#15803d', statusBorder: '#bbf7d0',
      contribution: '$500.00', nextPayment: 'Oct 15, 2023',
      members: [
        { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDCOsdsYLaAjBZxqLzYtv1nhwhYUc1scMclR-XB8MGNPfCVb8e51BLMAgRogMLQDMapU-Wwvliz2LKqLICwUzuW_VYeyBocViC9nPHXxt4FErpqzeQTvbMhSG2bVxTgP1lhAjRo95Zn_-YFdET6w5ZykRMyprJtKtC_vMoal7KlNF3VpsVsNJ04q-AtDwlroB2sNLI4VO11cGngHDNJ3XTzxPQmCb1hJ2-EOShhRi3u5149pJvf_CE7VKFAP0o-WLgIYoMM49GJV-A', alt: 'Member 1' },
        { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxs5NGdevMgmxsRnKufKSqaoHVWf7xAJntQ_kev_oGTRM6KUhi6ulXcUweJaTJfaqrD6LX6N4YFk7f3tLCLGguClpkircfzG9wyljKfGwqBZttXbUlpeQgIsseNOtnpjdEK0Ygq1Z5NzCvit6RQEIkCY84jDcXW01syoCDMJgdhIi11iahH8y6CtSfJKSNMVNkyLNnkdCbHyqfP7d0FWl9GsSwMVqDPjDNNB__X0mOrocM8N0XsjEGNNg0y6KAltIkEMcraezITFg', alt: 'Member 2' },
        { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATs0SYz41JvOiuTx1idyBgZGdqI-s875N3QhdlRmbjzNA495IZA_mpf-zUFt9FOQWU_t6H7K2YyCcKDRG3sjN18i2LvicbhhCdpDRehmsZg9b5GxjI2sAJ-vGnhQgE1xpUVtNTX7QZbKbBnoHIGayuskepp3uxL31Ye4TFDSu4YeVZMmiP_tYFHjqEnQBYqpD380Q_fV4msdNFx0CVPuUAx5cD-A0Onckhbad1wM4ctu4jn8Nzdm_-Z0IggNcVCE9hRUIFhkOL2Vo', alt: 'Member 3' },
      ],
      extraCount: '+8', trustWidth: '98%'
    },
    {
      name: 'Real Estate Syndicate', role: 'Admin',
      status: 'Recruiting', statusBg: '#eff6ff', statusColor: '#1d4ed8', statusBorder: '#bfdbfe',
      contribution: '$2,500.00', nextPayment: 'TBD',
      members: [
        { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAOK00AlVrS7VqTX_1ybs0Ftuo04TFER-6tyxbsI2KWyb3oT0IWlFwjfwmSk0VQbQqDSfZw51lzuATzcMS3ZKiIeqLQcB1elVM1wafx4NHFcBgXcd6nqyQVxXYbdT_HPrgoGpcYHjTME-q6fTc4mjqAXtRuoD9fdv_VBlIObG_3iwchKhy-UFyAHen-ifcUE1R5uTw7hRQu0dzZ7DkoIUJGmzAUrr60I_gz0KTzsgbqTOoA3u63TqDLP7ssriPVvKSDeRLZUHuypls', alt: 'Member 1' },
      ],
      extraCount: '3/12', trustWidth: '25%'
    }
  ];

  memberCommittees: MemberCommittee[] = [
    {
      name: 'Education Fund 2024', status: 'Active',
      statusBg: '#f0fdf4', statusColor: '#15803d', statusBorder: '#bbf7d0',
      contribution: '$200.00', paymentDate: 'Oct 05', participants: '24 Members'
    },
    {
      name: 'Neighborhood Co-op', status: 'Active',
      statusBg: '#f0fdf4', statusColor: '#15803d', statusBorder: '#bbf7d0',
      contribution: '$50.00', paymentDate: 'Oct 01', participants: '15 Members'
    }
  ];
}
