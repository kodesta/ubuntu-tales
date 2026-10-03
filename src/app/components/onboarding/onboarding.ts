import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.css',
})
export class Onboarding {
  @Output() joinTribe = new EventEmitter<void>();
  @Output() skip = new EventEmitter<void>();

  onJoinTribe() {
    this.joinTribe.emit();
  }

  onSkip() {
    this.skip.emit();
  }
}
