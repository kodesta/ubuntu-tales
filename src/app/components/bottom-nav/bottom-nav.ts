import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-bottom-nav',
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.css',
})
export class BottomNav {
  @Input() activeTab: 'home' | 'library' | 'tribes' | 'saved' = 'home';
  @Output() tabChange = new EventEmitter<'home' | 'library' | 'tribes' | 'saved'>();

  selectTab(tab: 'home' | 'library' | 'tribes' | 'saved') {
    this.tabChange.emit(tab);
  }
}
