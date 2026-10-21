import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-player',
  imports: [CommonModule],
  templateUrl: './player.html',
  styleUrl: './player.css',
})
export class Player {
  @Output() back = new EventEmitter<void>();
  @Output() readStory = new EventEmitter<void>();

  isPlaying = signal<boolean>(true);
  currentTime = signal<number>(57); // 00:57 in seconds
  totalDuration = signal<number>(312); // 05:12 in seconds
  speed = signal<'0.75x' | '1x' | '1.5x' | '2x'>('1x');
  soundscapeActive = signal<boolean>(true);

  speeds: ('0.75x' | '1x' | '1.5x' | '2x')[] = ['0.75x', '1x', '1.5x', '2x'];

  togglePlay() {
    this.isPlaying.update(v => !v);
  }

  skipBackward(seconds = 15) {
    this.currentTime.update(curr => Math.max(0, curr - seconds));
  }

  skipForward(seconds = 15) {
    this.currentTime.update(curr => Math.min(this.totalDuration(), curr + seconds));
  }

  cycleSpeed() {
    const currentIndex = this.speeds.indexOf(this.speed());
    const nextIndex = (currentIndex + 1) % this.speeds.length;
    this.speed.set(this.speeds[nextIndex]);
  }

  onSeek(event: Event) {
    const input = event.target as HTMLInputElement;
    this.currentTime.set(Number(input.value));
  }

  toggleSoundscape() {
    this.soundscapeActive.update(v => !v);
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  getProgressPercentage(): number {
    return (this.currentTime() / this.totalDuration()) * 100;
  }

  onBack() {
    this.back.emit();
  }

  onReadStory() {
    this.readStory.emit();
  }
}
