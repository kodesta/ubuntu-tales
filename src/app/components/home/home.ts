import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  @Output() openStory = new EventEmitter<void>();
  @Output() openTribes = new EventEmitter<void>();
  @Output() playAudio = new EventEmitter<void>();

  onSelectStory() {
    this.openStory.emit();
  }

  onViewAllTribes() {
    this.openTribes.emit();
  }

  onPlayAudio(event: Event) {
    event.stopPropagation();
    this.playAudio.emit();
  }
}
