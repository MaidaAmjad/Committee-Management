import { Injectable } from '@angular/core';

export interface CommitteeFormData {
  name: string;
  monthlyAmount: number;
  maxMembers: number;
  description: string;
  durationMonths: number;
}

@Injectable({ providedIn: 'root' })
export class CommitteeService {
  createCommittee(data: CommitteeFormData): void {
    console.log('Committee created:', data);
  }
}
