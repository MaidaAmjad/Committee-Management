import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-topnav',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './topnav.html',
  styleUrl: './topnav.scss'
})
export class TopnavComponent {
  @Input() userName = 'Alex Johnson';
  @Input() userAvatar = 'https://lh3.googleusercontent.com/aida-public/AB6AXuD8RGX9KK3Z2oAKfNzhBFwqoIJp6z2TnvJy3zIzDG1SwyfsQ2ypk_vnI0AP0RWHFY52KVBPfIa7xmM7bmCYgFC8h9Nc-_ifMOgs2aV_BXWGW29ZSwUGBBCqtjcxZ_pXppwsL5nxt2p46f6szy7qg_bF73QgK0lbsN8X3knh7HxWZTlCFqgojGOMzJYQOb8400jq9UrwLTHpYKMTH78mtw71_1ecikne6C21LXKxnNjh-PdCyE9dkuxSCko6-1hu05mQ9SASZIvFnWI';
  @Input() searchPlaceholder = 'Search committees, tags, or categories...';
  @Input() offsetLeft = true;

  searchQuery = '';
}
