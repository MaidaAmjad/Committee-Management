import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { TopnavComponent } from '../../shared/topnav/topnav';

export interface ActivityItem {
  icon: string;
  iconBg: string;
  iconColor: string;
  message: string;
  time: string;
}

export interface CommitteeCard {
  icon: string;
  iconBg: string;
  iconColor: string;
  name: string;
  description: string;
  members: { src: string; alt: string }[];
  extraCount: number;
}

export interface SuggestedCommittee {
  image: string;
  name: string;
  description: string;
}

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, SidebarComponent, TopnavComponent],
  templateUrl: './user-dashboard.html',
  styleUrl: './user-dashboard.scss'
})
export class UserDashboardComponent {
  trustScore = 95;
  trustDashOffset = 22; // 440 * (1 - 0.95) = 22

  stats = [
    { label: 'Active Committees', value: '4', icon: 'groups', bg: '#dbe1ff', iconColor: '#00174b' },
    { label: 'Completed', value: '12', icon: 'verified', bg: '#d3e4fe', iconColor: '#0b1c30' },
    { label: 'Pending Payments', value: '$250.00', icon: 'payments', bg: '#ffdbcd', iconColor: '#360f00' },
  ];

  activeCommittees: CommitteeCard[] = [
    {
      icon: 'corporate_fare', iconBg: 'rgba(0,74,198,0.1)', iconColor: '#004ac6',
      name: 'Q3 Strategic Planning', description: '8 members • Next meeting: Tomorrow',
      members: [
        { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDZP82MxGG0GHCo7_-mNuQC2M6J9e9oj0pglBLq77G5UAPz92p-4Za1rurLXWJn1MV_B3WjTTEe5GoBUQbT79RjLR3fO-DW2vPZKreT955BM0RNVgBt-CKFh0Ef1Z4S6IigP33jNuUXhhmUm8cv9g5XBFytAQKHHR7IOhtN6iI7wtf9mDu7hHbLLYBVOI_bL5oimgVWaJ1_0bx2UOk9CKpoV2K2HcSm4eDpst7zbEgaskFOEecvzZJqyXa-SZswnUsBesyDoLtbKvQ', alt: 'Member 1' },
        { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBYJ-p-RyJOxCIF0gu_L_6fBhyFoOn1gSuY0attUP7amT3Vu45Y1tCRxNagQaQOpUke9Ic_Ba_DeP_hwSOt5aGdO2t2xXl-Y-u4GTJJws_H7FQB6vQED6uQWAWnlyXSDuESjxd7Ot8MAyshCIdrazqO7d27M1w5NcG35hxqQL5-ym-xdnBbJ55D5tfMFLgK9v-PHWTS3Y5owctQr1NwLaTGoh9BiEReyPtNt_RmXMXm4c121FUpKhBlwZ4t42f2ScG3OhIoYcEzY1A', alt: 'Member 2' },
      ],
      extraCount: 5
    },
    {
      icon: 'account_balance', iconBg: 'rgba(80,95,118,0.1)', iconColor: '#505f76',
      name: 'Annual Audit Group', description: '12 members • Documents pending',
      members: [
        { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAcRmf9XrzGZpRMMT6xxhZeo_YNMDGDmoIB_pObPLHqr0NcF6ClEbzfvAsT5fCykz1kBnYBx9IUckbzbxYY2c7rqbIr9h0dn7zZnspux_CnE4HBhQgaaRKLAogas-aApxXQ8fp7KkYmM_vSAsOzH0CHh-XDnftlWSmfZJp3eLbO4dAhngM_UQ_LuIdpfG5lW5cCUx6UxFnfbn7B0Pxgeq6aeUcW4fnoFq37bBvLKsRb9AkqKdd4dLrHl3mt7JuWUDfncpEmF6T0rR8', alt: 'Member 1' },
        { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBto1mzbqiiSMHBs7lm3aN_1X9wPN8OxWj_PDl-sroByvH1qkt1CptKxTg9YJwLc5tNh5o9I4r8CKg8v3UirvCN_ahzgIOpUX-xIPapID1A66yQ-0Ijm5sRrbwf5ojbXW_8VxL2EpHD8gKqh3c0QQBoGhpkH1y7SRI4aH6ZZuQf-n9n6KS3lZGljqFNPVrE796HGHVkRjLb-lRUAo042zHvC8qysTUZj1z2EyMeY6VSwUHu2OS3YvGF5fZr_OaPPKsgCLAAFNyRQ3s', alt: 'Member 2' },
      ],
      extraCount: 9
    }
  ];

  suggestedCommittees: SuggestedCommittee[] = [
    {
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB9QbmJvUwsmME2kL7n_-hTA5AM-5vHREfOAPsh2gGyaqg47FZL7HyrP0mA2OWPXUfMOUR0Pz9_ao8X3MPhiJ22lXeWD_skrkECjDqpY_Ndth55h5G3b8xY6SLXeUPhdZFS4j9Yo_qunQ44cWptmOaBcie8lk48SIjbc6P8zNwtZLkl18cUf2UD-6V64foUPOhbGUBFhRw0RU4yjAQtRRHNjw1X9r6LTMPFUsa8WBmQER5NlyfHgfo55LnbPy0C42KwLCXvaJwa3Lc',
      name: 'Tech Advisory Board', description: 'Focused on AI Ethics'
    },
    {
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAVswDVPlh3zaG7kz2O4hzA_3DxB0nlGVfk3qfBJQHI6zQMEYKMAw-d2TrGfRc7SF1TmDvS0yiwlYEuOzUqTMRmrpy_6NrqzELt3odilvF-X8YVvN4OFLD0yINPlLSX7rttqzqJP-lAkWguI9EbbNsy8n6fVfq_I1MlRPClJRZUMVDmBMILMuDDGyb7z46aZeDj8sNmnirtsFtRCM2nAeVSIvE_jr8c3uaJzLUMkH5mp6qWNZDULwKBTybmbg4Mh50vKXFKxjIuXyM',
      name: 'Urban Dev Council', description: 'Sustainability Initiatives'
    },
    {
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBflLmcM2JSjjGtWbTrLHIs2pm84LtnOay-lrtU3KQKnXgfgRHXLz-g9j1Ro-z4aWqAg4x2ijJ__l8-Qc3ndT64IpfBWyeZjGHxU9cvBi0J095U-OJPTPWrbvlCyp_wfvmbVP-1PKWBFBfQi-aqZIQnxx5no2qZrErzgjQTW-3c7RFFNQujbHy-FhtS8t-wztD1ysho3jdZrXZGNnJ1FHoKJyO8AB9HZOkS0xJlhb0t4gGiMAzAoPJSmAq4kONrkvPcl-DTZ_3H_gk',
      name: 'Budget Committee', description: 'Fiscal Year 2024'
    }
  ];

  activityItems: ActivityItem[] = [
    { icon: 'person_add', iconBg: '#dbe1ff', iconColor: '#004ac6', message: '<strong>Sarah Miller</strong> joined your committee <strong>Q3 Strategic Planning</strong>.', time: '2 minutes ago' },
    { icon: 'payments', iconBg: '#ffdbcd', iconColor: '#943700', message: 'Payment of <strong>$150.00</strong> confirmed for Board Membership.', time: '1 hour ago' },
    { icon: 'description', iconBg: '#d3e4fe', iconColor: '#505f76', message: 'New minutes uploaded for <strong>Annual Audit Group</strong>.', time: 'Yesterday at 4:30 PM' },
    { icon: 'error', iconBg: '#ffdad6', iconColor: '#ba1a1a', message: 'Trust Score alert: Your verification is expiring in <strong>3 days</strong>.', time: '2 days ago' },
  ];
}
