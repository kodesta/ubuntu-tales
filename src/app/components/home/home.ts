import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  @Output() openStory = new EventEmitter<void>();

  onSelectStory() {
    this.openStory.emit();
  }
}
